import { Agent, ChatMessage } from '../../types/index.js';
import { ToolDefinition, ToolRegistry, ToolExecutionContext, ToolExecutionResult } from '../tools/toolRegistry.js';
import { KnowledgeRetriever } from '../knowledge/retriever.js';
import { db } from '../../db/store.js';

export interface LLMRequestParams {
  agent: Agent;
  systemInstructions: string;
  knowledgeContext: string;
  memoryContext: string;
  userMessage: string;
  conversationHistory: ChatMessage[];
  availableTools: ToolDefinition[];
  executionContext: ToolExecutionContext;
}

export interface LLMResponseResult {
  replyText: string;
  toolInvocations: Array<{
    toolName: string;
    input: any;
    result: ToolExecutionResult;
  }>;
  tokensUsed: number;
}

export class LLMService {
  /**
   * Validates Gemini API key by calling Google Generative Language API
   */
  public static async validateGeminiKey(apiKey: string): Promise<{ success: boolean; model?: string; error?: string }> {
    if (!apiKey || apiKey.length < 15) {
      return { success: false, error: 'API key is too short or invalid format.' };
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const response = await fetch(url);
      const data: any = await response.json();

      if (data.error) {
        return { success: false, error: data.error.message || 'Invalid Gemini API key.' };
      }

      const models: any[] = data.models || [];
      const hasFlash = models.some(m => m.name?.includes('flash') || m.name?.includes('gemini'));
      return {
        success: true,
        model: hasFlash ? 'gemini-2.5-flash / gemini-2.0-flash' : 'gemini-pro',
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error connecting to Google Generative Language API.' };
    }
  }

  /**
   * Main dispatch method for LLM execution
   */
  public static async generateAgentResponse(params: LLMRequestParams): Promise<LLMResponseResult> {
    const tenant = db.getTenantById(params.agent.tenantId);
    const geminiKey = tenant?.settings?.customGeminiKey || (params.agent as any)?.geminiApiKey || process.env.GEMINI_API_KEY;
    const openaiKey = tenant?.settings?.customOpenAiKey || process.env.OPENAI_API_KEY;

    if (geminiKey && geminiKey.length > 15 && !geminiKey.includes('placeholder')) {
      try {
        return await this.callGeminiApi(geminiKey, params);
      } catch (err) {
        console.warn('⚠️ Gemini API call error, falling back to local engine:', err);
        return await this.runBuiltInAgentEngine(params);
      }
    } else if (openaiKey && openaiKey.length > 15 && !openaiKey.includes('placeholder')) {
      try {
        return await this.callOpenAiApi(openaiKey, params);
      } catch (err) {
        console.warn('⚠️ OpenAI API call error, falling back to local engine:', err);
        return await this.runBuiltInAgentEngine(params);
      }
    }

    // Default: High-fidelity deterministic built-in agent engine
    return await this.runBuiltInAgentEngine(params);
  }

  /**
   * Gemini Flash / Pro API Connector
   */
  private static async callGeminiApi(apiKey: string, params: LLMRequestParams): Promise<LLMResponseResult> {
    const systemPrompt = `${params.systemInstructions}

${this.personalityPrompt(params.agent)}

${params.memoryContext}

${params.knowledgeContext}

TOOL USAGE INSTRUCTIONS:
If an action is required (e.g. creating a lead, logging a booking request, filing a support ticket), output your response with a JSON tool call block in the following format:
\`\`\`tool_call
{
  "tool": "create_booking_request",
  "arguments": { "customerName": "...", "serviceName": "...", "requestedDate": "...", "requestedTime": "..." }
}
\`\`\`
Followed by your natural, courteous message to the user.
`;

    const contents: any[] = [];
    params.conversationHistory.slice(-6).forEach(m => {
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      });
    });
    contents.push({
      role: 'user',
      parts: [{ text: params.userMessage }]
    });

    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    let lastError: any = null;
    let candidateText = '';
    let totalTokens = 250;

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemPrompt }]
            },
            contents,
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1000,
            }
          })
        });

        if (response.ok) {
          const data: any = await response.json();
          candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          totalTokens = data?.usageMetadata?.totalTokenCount || 250;
          if (candidateText) break;
        } else {
          const errData: any = await response.json().catch(() => ({}));
          lastError = new Error(errData?.error?.message || `HTTP ${response.status}`);
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!candidateText) {
      throw lastError || new Error('No valid response from Gemini API models');
    }

    const toolInvocations: LLMResponseResult['toolInvocations'] = [];
    let cleanReply = candidateText;

    const toolMatch = candidateText.match(/```(?:tool_call|json)?\s*([\s\S]*?)\s*```/);
    if (toolMatch && toolMatch[1]) {
      try {
        const parsed = JSON.parse(toolMatch[1]);
        const toolName = parsed.tool || parsed.name;
        const toolArgs = parsed.arguments || parsed.args || parsed.parameters;

        if (toolName) {
          const toolDef = params.availableTools.find(t => t.name === toolName);
          if (toolDef) {
            const execResult = await toolDef.execute(toolArgs, params.executionContext);
            toolInvocations.push({
              toolName,
              input: toolArgs,
              result: execResult,
            });
          }
        }
        cleanReply = candidateText.replace(/```(?:tool_call|json)?\s*[\s\S]*?\s*```/, '').trim();
      } catch (err) {
        // Not a JSON tool call
      }
    }

    return {
      replyText: cleanReply || candidateText,
      toolInvocations,
      tokensUsed: totalTokens,
    };
  }

  /**
   * OpenAI API Connector
   */
  private static async callOpenAiApi(apiKey: string, params: LLMRequestParams): Promise<LLMResponseResult> {
    const url = 'https://api.openai.com/v1/chat/completions';

    const systemPrompt = `${params.systemInstructions}\n\n${params.memoryContext}\n\n${params.knowledgeContext}`;
    const messages: any[] = [{ role: 'system', content: systemPrompt }];

    params.conversationHistory.slice(-6).forEach(m => {
      messages.push({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      });
    });

    messages.push({ role: 'user', content: params.userMessage });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.3,
        max_tokens: 800,
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    const replyText = data?.choices?.[0]?.message?.content || '';
    const tokensUsed = data?.usage?.total_tokens || 200;

    return {
      replyText,
      toolInvocations: [],
      tokensUsed,
    };
  }

  /**
   * High-Fidelity Intelligent Deterministic Orchestration Fallback
   */
  private static async runBuiltInAgentEngine(params: LLMRequestParams): Promise<LLMResponseResult> {
    const { agent, userMessage, availableTools, executionContext } = params;
    const lower = userMessage.toLowerCase().trim();
    const toolInvocations: LLMResponseResult['toolInvocations'] = [];

    let reply = '';
    const tokensUsed = Math.floor(userMessage.length * 1.5) + 120;

    // Search knowledge items
    const knowledgeResults = KnowledgeRetriever.search(agent.tenantId, agent.id, userMessage, 2);
    const hasKnowledge = knowledgeResults.length > 0;
    const topKnowledge = hasKnowledge ? knowledgeResults[0] : null;

    // 1. Check for Appointment / Booking Inquiries
    const isBookingIntent = /(?:book|schedule|appointment|reserve|reservation|consultation|viewing|tour|table for|slot)/i.test(lower);
    if (isBookingIntent && availableTools.some(t => t.name === 'create_booking_request')) {
      const dateMatch = userMessage.match(/(?:tomorrow|next monday|next tuesday|next wednesday|next thursday|next friday|next saturday|next sunday|today|\d{4}-\d{2}-\d{2}|\b(?:mon|tues|wed|thurs|fri|sat|sun)[a-z]*|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)/i);
      const timeMatch = userMessage.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)|\b\d{1,2}\s*o'?clock\b|\bmorning\b|\bafternoon\b|\bevening\b)/i);
      const phoneMatch = userMessage.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
      const nameMatch = userMessage.match(/(?:my name is|i am|name is)\s+([A-Za-z\s]{2,30})/i);

      const requestedDate = dateMatch ? dateMatch[0] : 'Tomorrow';
      const requestedTime = timeMatch ? timeMatch[0] : '10:00 AM';
      const customerName = nameMatch ? nameMatch[1].trim() : (executionContext.username || 'Valued Client');
      const customerPhone = phoneMatch ? phoneMatch[0] : undefined;

      let serviceName = 'Standard Consultation';
      if (/dental|cleaning|teeth|whitening/i.test(lower)) serviceName = 'Dental Examination & Cleaning';
      else if (/checkup|doctor|physician|health/i.test(lower)) serviceName = 'Comprehensive Health Checkup';
      else if (/viewing|tour|penthouse|property|house/i.test(lower)) serviceName = 'Property Viewing Tour';
      else if (/table|dinner|lunch|reservation/i.test(lower)) serviceName = 'Dining Table Reservation';
      else if (/demo|software|sales/i.test(lower)) serviceName = 'Executive Solution Demo';

      const bookingTool = availableTools.find(t => t.name === 'create_booking_request')!;
      const toolResult = await bookingTool.execute({
        customerName,
        customerPhone,
        serviceName,
        requestedDate,
        requestedTime,
        notes: `User inquiry: "${userMessage}"`,
      }, executionContext);

      toolInvocations.push({
        toolName: 'create_booking_request',
        input: { customerName, customerPhone, serviceName, requestedDate, requestedTime },
        result: toolResult,
      });

      // Also create a lead if lead creation is enabled
      if (availableTools.some(t => t.name === 'create_lead')) {
        const leadTool = availableTools.find(t => t.name === 'create_lead')!;
        const leadResult = await leadTool.execute({
          fullName: customerName,
          phone: customerPhone,
          serviceRequested: serviceName,
          stage: 'QUALIFIED',
          score: 85,
          notes: `Appointment requested for ${requestedDate} at ${requestedTime}`,
        }, executionContext);
        toolInvocations.push({
          toolName: 'create_lead',
          input: { fullName: customerName, serviceRequested: serviceName },
          result: leadResult,
        });
      }

      reply = `Thank you, ${customerName}! I have recorded your appointment request for **${serviceName}** on **${requestedDate}** around **${requestedTime}**.\n\n📋 **Status:** Pending Staff Confirmation\nOur scheduling team will review the calendar and confirm your slot via message/phone shortly. Is there anything specific you would like our staff to prepare in advance?`;
      return { replyText: reply, toolInvocations, tokensUsed };
    }

    // 2. Check for Support / Technical / Issue / Complaint Inquiries
    const isSupportIntent = /(?:issue|problem|broken|error|bug|complaint|refund|not working|failed|failing|webhook|down|crash|help|refill|billing|invoice|charge|support|ticket)/i.test(lower);
    if (isSupportIntent && availableTools.some(t => t.name === 'create_support_ticket')) {
      const priority = /urgent|critical|emergency|asap|down|stolen/i.test(lower) ? 'URGENT' : (/billing|refund|invoice|charge/i.test(lower) ? 'HIGH' : 'MEDIUM');
      const ticketTool = availableTools.find(t => t.name === 'create_support_ticket')!;
      const ticketResult = await ticketTool.execute({
        subject: userMessage.length > 50 ? userMessage.substring(0, 47) + '...' : userMessage,
        description: userMessage,
        category: /billing|refund|invoice|charge/i.test(lower) ? 'Billing' : (/prescript|refill|med/i.test(lower) ? 'Pharmacy & Care' : 'Technical Support'),
        priority,
        escalateToStaff: priority === 'URGENT' || priority === 'HIGH',
      }, executionContext);

      toolInvocations.push({
        toolName: 'create_support_ticket',
        input: { subject: userMessage, priority },
        result: ticketResult,
      });

      let knowledgeSolution = '';
      if (hasKnowledge && topKnowledge) {
        knowledgeSolution = `\n\n💡 **Helpful Reference from Knowledge Base:**\n${topKnowledge.item.content}\n`;
      }

      reply = `I understand your concern and am here to help. I have created a tracked support ticket **#${ticketResult.ticket?.id || 'TKT-LIVE'}** (${priority} Priority) for our team.${knowledgeSolution}\nOur specialists are reviewing this and will follow up with you directly. If this requires immediate attention, please let me know and I can escalate to a senior supervisor.`;
      return { replyText: reply, toolInvocations, tokensUsed };
    }

    // 3. Check for Sales / Purchasing / Pricing / Package Inquiries
    const isSalesIntent = /(?:price|pricing|cost|package|plan|quote|buy|enterprise|starter|growth|hire|consult|proposal)/i.test(lower);
    if (isSalesIntent && availableTools.some(t => t.name === 'create_lead')) {
      const leadTool = availableTools.find(t => t.name === 'create_lead')!;
      const leadResult = await leadTool.execute({
        fullName: executionContext.username || 'Interested Prospect',
        serviceRequested: 'Sales & Pricing Inquiry',
        stage: 'QUALIFYING',
        score: 75,
        notes: `Inquired about: "${userMessage}"`,
      }, executionContext);

      toolInvocations.push({
        toolName: 'create_lead',
        input: { stage: 'QUALIFYING', score: 75 },
        result: leadResult,
      });

      if (hasKnowledge && topKnowledge) {
        reply = `Here is the verified pricing and package information for **${agent.businessName}**:\n\n${topKnowledge.item.content}\n\nWould you like me to connect you with a senior advisor or schedule a customized walkthrough for your team?`;
      } else {
        reply = `We offer flexible solutions tailored to your goals. Our team provides customized plans based on your volume and timeline.\n\nCould you share a bit more about your team size, key requirements, and ideal start date so I can present the most cost-effective package?`;
      }
      return { replyText: reply, toolInvocations, tokensUsed };
    }

    // 4. Check for Location / Working Hours inquiries
    const isHoursLocation = /(?:hours|open|close|when|where|location|address|directions|parking|phone|contact)/i.test(lower);
    if (isHoursLocation && hasKnowledge) {
      const hoursItem = knowledgeResults.find(k => k.item.type === 'hours_location') || topKnowledge;
      if (hoursItem) {
        reply = `Here are the location and operating hours for **${agent.businessName}**:\n\n${hoursItem.item.content}\n\nLet me know if you need directions or would like to schedule a visit!`;
        return { replyText: reply, toolInvocations, tokensUsed };
      }
    }

    // 5. Answer using retrieved knowledge base content
    if (hasKnowledge && topKnowledge) {
      reply = `${topKnowledge.item.content}\n\nPlease let me know if you would like more details or if you have any other questions about ${agent.businessName}!`;
      return { replyText: reply, toolInvocations, tokensUsed };
    }

    // 6. Generic Friendly Persona Greetings & Default fallback
    if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening)\b/i.test(lower)) {
      if (agent.type === 'AI_RECEPTIONIST') {
        reply = `Hello and welcome to **${agent.businessName}**! 👋\nI am ${agent.name}, your digital receptionist. I can help you with:\n• Scheduling appointments & checkups\n• Checking our services, pricing, & office hours\n• Answering clinic policies & doctor information\n\nHow can I assist you today?`;
      } else if (agent.type === 'SALES_AGENT') {
        reply = `Hello! Welcome to **${agent.businessName}**. 🚀\nI am ${agent.name}. Whether you are looking to scale your workflows, compare plans, or explore custom solutions, I'm here to help you find the perfect fit.\n\nWhat goals is your organization focusing on right now?`;
      } else if (agent.type === 'CUSTOMER_SUPPORT') {
        reply = `Hello! Thank you for reaching out to **${agent.businessName} Support**. 🛠️\nI am ${agent.name}. How can I assist you with your account, service, or technical questions today?`;
      } else {
        reply = `Hello! Welcome to **${agent.businessName}**. I am ${agent.name}. How can I assist you today?`;
      }
      return { replyText: reply, toolInvocations, tokensUsed };
    }

    // Fallback: Polite truthful response when knowledge is unavailable
    reply = `Thank you for your question. I want to provide you with the most accurate information regarding **${agent.businessName}**.\n\nWhile I don't have that specific detail in my verified database right now, I can certainly record your inquiry for our staff or connect you with a representative. Would you like me to have someone reach out to you?`;
    return { replyText: reply, toolInvocations, tokensUsed };
  }

  private static personalityPrompt(agent: Agent): string {
    switch (agent.personality) {
      case 'Friendly':
        return 'Adopt a warm, inviting, and cheerful personality. Use friendly phrasing and positive emojis.';
      case 'Professional':
        return 'Adopt a polished, authoritative, corporate, and articulate tone.';
      case 'Concise':
        return 'Be direct, sharp, and brief. Prioritize bullet points and avoid filler language.';
      case 'Premium':
        return 'Adopt a luxury concierge demeanor. Gracious, high-end, and exceptionally polite.';
      case 'Helpful':
        return 'Be deeply empathetic, patient, and proactive in solving the user needs.';
      case 'Casual':
        return 'Be relaxed, conversational, modern, and easy-going.';
      default:
        return agent.customPersonalityPrompt || 'Be polite and helpful.';
    }
  }
}
