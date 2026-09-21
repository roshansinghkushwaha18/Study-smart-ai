/**
 * StudySmart AI - Academic Backend Server
 * Technology: Node.js, Express.js, OpenAI-compatible providers
 * Default free tutoring mode: Ollama at http://127.0.0.1:11434/v1
 */

const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const OpenAI = require('openai');

const dotenvPath = path.join(__dirname, '.env');
const dotenvResult = dotenv.config({ path: dotenvPath });

const app = express();

const HOST = (process.env.HOST || '127.0.0.1').trim();
const PORT = Number(process.env.PORT) || 5000;

const AI_PROVIDER = (process.env.AI_PROVIDER || 'ollama').trim().toLowerCase();
const OPENAI_MODEL = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1').trim().replace(/\/+$/, '');
const OLLAMA_MODEL = (process.env.OLLAMA_MODEL || 'llama3.2').trim();
const GROQ_BASE_URL = (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').trim().replace(/\/+$/, '');
const GROQ_MODEL = (process.env.GROQ_MODEL || 'llama-3.1-8b-instant').trim();
const GEMINI_BASE_URL = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai').trim().replace(/\/+$/, '');
const GEMINI_MODEL = (process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim();
const LOCAL_TUTOR_FALLBACK = process.env.LOCAL_TUTOR_FALLBACK !== 'false';

console.log('[Config] Starting StudySmart AI server');
console.log(`[Config] HOST=${HOST} PORT=${PORT} AI_PROVIDER=${AI_PROVIDER}`);

process.on('uncaughtException', (err) => {
  console.error('Server Uncaught Exception:', err && err.message ? err.message : err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Server Unhandled Rejection:', reason && reason.message ? reason.message : reason);
});

const openaiApiKey = (process.env.OPENAI_API_KEY || '').trim();
const isPlaceholderApiKey = /^(?:sk-\.\.\.|sk-your[-_].*key|your_actual_openai_api_key_here)$/i.test(openaiApiKey);
const isApiKeyConfigured = Boolean(
  openaiApiKey &&
  !isPlaceholderApiKey &&
  openaiApiKey.startsWith('sk-') &&
  openaiApiKey.length > 20
);

const apiKeyState = !openaiApiKey ? 'missing' : isPlaceholderApiKey ? 'placeholder' : isApiKeyConfigured ? 'present' : 'invalid-format';
console.log(`[Config] .env ${dotenvResult.error ? 'not loaded' : 'loaded'} from ${dotenvPath}; OPENAI_API_KEY: ${apiKeyState}; AI_PROVIDER=${AI_PROVIDER}`);

let openai = null;
if (isApiKeyConfigured) {
  try {
    openai = new OpenAI({ apiKey: openaiApiKey });
    console.log(`[OpenAI SDK] Initialized successfully with model: ${OPENAI_MODEL}`);
  } catch (initErr) {
    console.error('[OpenAI SDK] Initialization failed:', initErr.message);
  }
} else {
  console.log('[OpenAI SDK] No valid key configured. Local free provider mode remains available.');
}

const LOCAL_PROVIDERS = ['ollama', 'groq', 'gemini'];

function isLocalProvider(providerName) {
  return LOCAL_PROVIDERS.includes((providerName || AI_PROVIDER).toLowerCase());
}

function getProviderBaseUrl(providerName) {
  const name = (providerName || AI_PROVIDER).toLowerCase();
  if (name === 'openai') return 'https://api.openai.com/v1';
  if (name === 'ollama') return OLLAMA_BASE_URL;
  if (name === 'groq') return GROQ_BASE_URL;
  if (name === 'gemini') return GEMINI_BASE_URL;
  return OLLAMA_BASE_URL;
}

function getProviderModelName(providerName) {
  const name = (providerName || AI_PROVIDER).toLowerCase();
  if (name === 'openai') return OPENAI_MODEL;
  if (name === 'ollama') return OLLAMA_MODEL;
  if (name === 'groq') return GROQ_MODEL;
  if (name === 'gemini') return GEMINI_MODEL;
  return OLLAMA_MODEL;
}

function getProviderApiKey(providerName) {
  const name = (providerName || AI_PROVIDER).toLowerCase();
  if (name === 'groq') return (process.env.GROQ_API_KEY || '').trim();
  if (name === 'gemini') return (process.env.GEMINI_API_KEY || '').trim();
  return openaiApiKey;
}

function buildCandidateProviders(preferredProvider) {
  const preferred = (preferredProvider || AI_PROVIDER || 'ollama').toLowerCase();
  const list = [preferred];

  if (preferred !== 'ollama') list.push('ollama');
  if (preferred !== 'openai' && isApiKeyConfigured) list.push('openai');
  if (preferred !== 'groq' && process.env.GROQ_API_KEY) list.push('groq');
  if (preferred !== 'gemini' && process.env.GEMINI_API_KEY) list.push('gemini');

  return [...new Set(list.filter(Boolean))];
}

function shouldUseLocalFallback(err) {
  if (!err) return false;
  const code = (err.code || '').toLowerCase();
  const status = Number(err.status || err.statusCode || 0);
  const message = (err.message || '').toLowerCase();
  return (
    code.includes('credit_balance_exhausted') ||
    code.includes('invalid_api_key') ||
    code.includes('rate_limit_exceeded') ||
    message.includes('quota') ||
    message.includes('billing') ||
    message.includes('credit') ||
    message.includes('unauthorized') ||
    status === 401 ||
    status === 429
  );
}

async function callProvider(providerName, messages, temperature, max_tokens) {
  const name = (providerName || AI_PROVIDER).toLowerCase();
  const url = `${getProviderBaseUrl(name).replace(/\/+$/, '')}/chat/completions`;
  const model = getProviderModelName(name);
  const apiKey = getProviderApiKey(name);

  const headers = { 'Content-Type': 'application/json' };

  if (name === 'openai' && apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  } else if (name === 'groq' && apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  } else if (name === 'gemini' && apiKey) {
    headers['x-goog-api-key'] = apiKey;
  } else if (name === 'ollama') {
    headers.Authorization = 'Bearer ollama';
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens,
      stream: false
    })
  });

  if (!response.ok) {
    const text = await response.text();
    const err = new Error(`${name} provider failed with status ${response.status}: ${text.slice(0, 500)}`);
    err.status = response.status;
    err.code = /rate/i.test(text) ? 'rate_limit_exceeded' : 'provider_error';
    throw err;
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || data?.message?.content || data?.content || '';
  if (!content) {
    throw new Error(`${name} provider returned an empty response.`);
  }

  return {
    provider: name,
    content: String(content).trim()
  };
}

async function generateChatCompletion({ messages, temperature = 0.7, max_tokens = 1500, preferredProvider = AI_PROVIDER }) {
  const candidates = buildCandidateProviders(preferredProvider);
  let lastError = null;

  for (const candidate of candidates) {
    try {
      return await callProvider(candidate, messages, temperature, max_tokens);
    } catch (err) {
      lastError = err;
      console.warn(`[AI Provider] ${candidate} failed: ${err && err.message ? err.message : err}`);

      if (candidate === 'openai' && shouldUseLocalFallback(err)) {
        continue;
      }

      if (candidate === 'openai' && !isApiKeyConfigured) {
        continue;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('No AI provider available.');
}

function createLegacyLocalTutorReply(message) {
  const cleanMessage = String(message || '').trim() || 'the selected study topic';
  const normalizedMessage = cleanMessage.toLowerCase();

  if (/^(hi|hello|hey|namaste)\b/.test(normalizedMessage)) {
    return `**1. Definition**
A greeting is a friendly opening that starts a conversation and creates a comfortable learning environment.

**2. Three key ideas**
- You can ask for help with any academic topic.
- I can explain concepts step by step using simple language.
- Asking a specific question helps produce a more useful answer.

**3. Business example**
A tutor platform can greet a student and then recommend a study path based on the student's goal. A useful metric is the percentage of students who begin a lesson after the greeting.

**4. Practice example**
Definition: A greeting starts a friendly conversation.
Three key points: It welcomes, builds comfort, and invites a question.
Practical example: Say hello before asking for an explanation of marketing.
Limitation: A greeting alone does not explain a subject.

For another industry, keep the friendly opening but change the example and metric to match that industry's customer journey.`;
  }

  if (/\bwhat is marketing\b|\bdefine marketing\b|^marketing\??$/.test(normalizedMessage)) {
    return `**1. Definition**
Marketing is the process of understanding customer needs, creating value, communicating an offer, and building exchanges that support customer and business goals.

**2. Three key ideas**
- Core vocabulary includes customer needs, value proposition, target market, marketing mix, and customer relationship.
- Research identifies a need, strategy selects a target, and the marketing mix turns the strategy into a product, price, place, and promotion decision.
- Marketing is broader than advertising: advertising is one communication tool inside the larger process.

**3. Business example**
Nike decides to launch a running shoe for beginner runners. It uses customer research to choose the audience, positions the shoe around comfort, sells through stores and digital channels, and measures conversion rate and repeat purchase rate.

**4. Practice example**
Definition: Marketing creates and communicates value for a chosen customer group.
Three key points: Research needs, choose a target, coordinate the 4Ps.
Practical example: A café promotes a student breakfast bundle through campus social media.
Limitation: Strong promotion cannot fix a poor product or an unclear customer need.

In another industry, keep the same process but change the customer problem, value proposition, channel, and success metric.`;
  }

  const arithmeticMatch = normalizedMessage.match(/^(?:what is|calculate|solve|find)\s+([\d\s+\-*/().x÷]+)\??$/i);
  if (arithmeticMatch) {
    const expression = arithmeticMatch[1].replace(/x/gi, '*').replace(/÷/g, '/');
    if (/^[\d\s+\-*/().]+$/.test(expression)) {
      try {
        const result = Function(`"use strict"; return (${expression});`)();
        if (Number.isFinite(result)) {
          return `**1. Definition**
The expression ${expression} is an arithmetic calculation that combines numbers and mathematical operations to produce a result.

**2. Three key ideas**
- Addition combines quantities, while subtraction finds a difference.
- Multiplication represents repeated groups, and division shares a quantity into equal parts.
- The order of operations matters: brackets, multiplication or division, then addition or subtraction.

**3. Business example**
Photosynthesis: correct answer
12 x 8: 96
Server: running on http://127.0.0.1:5000Photosynthesis: correct answer
12 x 8: 96
Server: running on http://127.0.0.1:5000OPENAI_API_KEY=
GEMINI_API_KEY=OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_google_gemini_api_keygit add public/script.js
git commit -m "Fix AI tutor on GitHub Pages"
git push origin mainA shop selling ${expression} units has ${result} units in total. A useful metric for a real stock decision would be inventory turnover.

**4. Practice example**
Definition: Arithmetic calculates a numerical result.
Three key points: Follow operation order, calculate each step, check the result.
Practical example: ${expression} = ${result}.
Limitation: A calculation is only reliable when the numbers and units are correct.

In another industry, the same arithmetic may represent revenue, inventory, distance, dosage, or another domain-specific quantity.`;
        }
      } catch (error) {
        // Continue to the general local explanation when the expression is invalid.
      }
    }
  }

  if (/\bwhat is ai\b|\bartificial intelligence\b|\bdefine ai\b/.test(normalizedMessage)) {
    return `**1. Definition**
Artificial intelligence is the field of building computer systems that perform tasks such as recognizing patterns, understanding language, making predictions, and supporting decisions.

**2. Three key ideas**
- Data provides examples, an algorithm finds patterns, and a model uses those patterns to produce an output.
- Training adjusts a model using examples; evaluation tests whether it works on new data rather than only memorizing old data.
- AI can assist human decisions, but it can produce errors, reflect biased data, and require human review.

**3. Business example**
An online store can use AI to recommend products from browsing and purchase behavior. The business should test recommendation quality and measure click-through rate, conversion rate, and average order value.

**4. Practice example**
Definition: AI enables computers to perform pattern-based tasks that usually require human intelligence.
Three key points: It uses data, learns patterns, and produces predictions or decisions.
Practical example: A bank flags unusual transactions for review.
Limitation: AI does not guarantee correct or unbiased decisions.

In another industry, keep the same workflow but change the data, risk level, human review, and success metric.`;
  }

  if (/swot/.test(normalizedMessage) && /nike/.test(normalizedMessage)) {
    return `## SWOT Analysis of Nike

This free local answer did not require OpenAI billing.

**1. Definition**
SWOT analysis evaluates Nike's internal strengths and weaknesses alongside external opportunities and threats.

**2. Three key ideas**
- **Strengths:** Nike has a globally recognized brand, strong athlete endorsements, powerful design capabilities, and a large direct-to-consumer digital channel.
- **Weaknesses:** Premium pricing can limit accessibility, and Nike depends heavily on outsourced manufacturing and continued brand relevance.
- **Opportunities and threats:** Nike can grow through digital communities, women’s and emerging-market products, while facing intense competition, changing consumer tastes, supply-chain disruption, and sustainability pressure.

**3. Business example**
Nike's apps, limited product drops, and athlete storytelling turn a shoe into a lifestyle product. This uses brand strength and digital engagement to support premium pricing, while direct sales give Nike more control over customer relationships and data.

**4. Practice example**
Choose a local sportswear brand and write one item for each SWOT box. Then recommend one strategy, such as using a social-media community to convert a strength into an opportunity.`;
  }

  if (/swot/.test(normalizedMessage) && /apple/.test(normalizedMessage)) {
    return `## SWOT Analysis of Apple

This free local answer did not require OpenAI billing.

**1. Definition**
SWOT analysis studies Apple’s internal capabilities and limitations, then compares them with external growth opportunities and risks.

**2. Three key ideas**
- **Strengths:** Apple has high brand equity, an integrated hardware-software ecosystem, loyal customers, strong design, and recurring services revenue.
- **Weaknesses:** Its products are expensive, the ecosystem can feel closed, and revenue concentration around iPhone demand creates risk.
- **Opportunities and threats:** Services, wearables, health technology, and emerging markets are opportunities; regulation, intense smartphone competition, supply-chain dependence, and imitation are threats.

**3. Business example**
An iPhone customer may also buy AirPods, an Apple Watch, iCloud, and Apple Music. The ecosystem increases switching costs and customer lifetime value, so Apple competes on the total experience rather than only on device specifications.

**4. Practice example**
Compare Apple with Samsung. Put two evidence-based points in each SWOT category and explain which company has the stronger opportunity in services or emerging markets.`;
  }

  if (/swot/.test(normalizedMessage)) {
    return `## SWOT Analysis

This free local answer did not require OpenAI billing.

**1. Definition**
SWOT is a strategic framework that examines Strengths and Weaknesses inside an organization and Opportunities and Threats in its external environment.

**2. Three key ideas**
- Strengths and weaknesses are internal, such as brand reputation, skills, costs, technology, or limited resources.
- Opportunities and threats are external, such as market growth, new customer needs, competitors, regulation, or economic change.
- The best strategy matches an internal strength with an external opportunity and reduces a weakness exposed by a threat.

**3. Business example**
For a coffee shop, a loyal local customer base is a strength, limited seating is a weakness, office delivery is an opportunity, and a large chain opening nearby is a threat. The shop could use loyalty data and delivery bundles to defend its market.

**4. Practice example**
Create a four-box SWOT for one brand you know. For every point, add evidence and finish with one SO, WO, ST, or WT strategy.`;
  }

  if (/seo/.test(normalizedMessage) && /sem/.test(normalizedMessage)) {
    return `## SEO vs SEM

This free local answer did not require OpenAI billing.

**1. Definition**
SEO earns unpaid visibility in search results through relevance and site quality, while SEM commonly uses paid search advertising to buy targeted visibility.

**2. Three key ideas**
- **SEO:** keyword research, useful content, technical performance, internal links, and credible backlinks improve organic ranking over time.
- **SEM:** advertisers select keywords, write ad copy, set bids and budgets, and pay when users click or under the chosen campaign model.
- **Trade-off:** SEO usually takes longer but can compound; SEM is faster and measurable but stops producing paid traffic when budget stops.

**3. Business example**
A new online shoe store can use SEM to appear immediately for “buy running shoes,” while publishing sizing guides and training content to build SEO traffic. SEM captures urgent demand; SEO builds lower-cost long-term discovery.

**4. Practice example**
For a college course, list three SEO keywords and three SEM ad keywords. Explain search intent, expected cost, and which metric you would track: organic clicks for SEO or CTR and conversion rate for SEM.`;
  }

  if (/4\s*p|4ps|marketing mix|product.*price.*place.*promotion/.test(normalizedMessage)) {
    return `## The 4Ps Marketing Mix

This free local answer did not require OpenAI billing.

**1. Definition**
The 4Ps are Product, Price, Place, and Promotion: the controllable decisions a business combines to deliver value to a target market.

**2. Three key ideas**
- **Product:** features, quality, design, packaging, brand, and customer benefit.
- **Price and Place:** price communicates value and affects margin; place covers channels, availability, logistics, and convenience.
- **Promotion:** advertising, sales promotion, public relations, social media, content, and personal selling communicate the offer.

**3. Business example**
For a premium coffee brand, the product may emphasize ethically sourced beans, the price signals quality, place includes cafés and a delivery app, and promotion uses barista stories and loyalty offers. The four decisions must support the same positioning.

**4. Practice example**
Choose a product and write one decision for each P. Then check consistency: would the chosen promotion convince customers to pay the stated price through the selected channel?`;
  }

  if (/stp|segmentation.*targeting.*positioning|target market/.test(normalizedMessage)) {
    return `## STP Marketing Framework

This free local answer did not require OpenAI billing.

**1. Definition**
STP means Segmentation, Targeting, and Positioning: dividing a market, selecting the most attractive segment, and creating a clear place in that segment’s mind.

**2. Three key ideas**
- **Segmentation:** group customers by demographic, geographic, psychographic, or behavioral similarities.
- **Targeting:** evaluate segment size, growth, profitability, accessibility, and fit with the company’s capabilities.
- **Positioning:** define the benefit and distinctive reason to choose the brand compared with alternatives.

**3. Business example**
A fitness app may segment users by goals, target busy university students who need short workouts, and position itself as “the five-minute campus fitness coach.” That positioning guides the app design, pricing, and advertising message.

**4. Practice example**
Pick a café or app. Describe two possible segments, select one using three criteria, and write a positioning statement: “For [target], [brand] is the [category] that [benefit] because [reason to believe].”`;
  }

  if (/\bgdp\b|gross domestic product/.test(normalizedMessage)) {
    return `## Gross Domestic Product (GDP)

This free local answer did not require OpenAI billing.

**1. Definition**
GDP is the monetary value of final goods and services produced within a country’s borders during a specific period.

**2. Three key ideas**
- The expenditure identity is $GDP = C + I + G + (X - M)$: consumption, investment, government spending, and net exports.
- Nominal GDP uses current prices; real GDP removes the effect of price changes and is better for comparing output over time.
- GDP measures production, not complete well-being: it does not fully capture inequality, unpaid work, environmental damage, or quality of life.

**3. Business example**
When real GDP grows, households and firms may have stronger demand for products and investment. A marketing team can use GDP trends with category data, inflation, and consumer confidence before expanding a campaign.

**4. Practice example**
If consumption is 500, investment is 120, government spending is 180, exports are 90, and imports are 70, calculate GDP: $500 + 120 + 180 + (90 - 70) = 820$.`;
  }

  if (/elasticity|price elasticity|demand elasticity/.test(normalizedMessage)) {
    return `## Price Elasticity of Demand

This free local answer did not require OpenAI billing.

**1. Definition**
Price elasticity of demand measures how strongly quantity demanded changes when price changes.

**2. Three key ideas**
- The formula is $E_d = \\%\\Delta Q_d / \\%\\Delta P$; demand is elastic when the absolute value is greater than 1 and inelastic when it is less than 1.
- Substitutes, necessity, time, and the share of income influence elasticity. More substitutes usually make demand more elastic.
- For elastic demand, a price cut can increase total revenue; for inelastic demand, a price increase may increase total revenue, assuming other factors stay constant.

**3. Business example**
Generic bottled water in a crowded market may be price-sensitive because customers can switch brands. A unique prescription medicine may be relatively inelastic because substitutes are limited.

**4. Practice example**
Price rises 10% and quantity demanded falls 20%. Elasticity is $-20\\% / 10\\% = -2$, so demand is elastic. Predict what a price increase would likely do to total revenue.`;
  }

  if (/machine learning|\bml\b|supervised|unsupervised/.test(normalizedMessage)) {
    return `## Machine Learning Basics

This free local answer did not require OpenAI billing.

**1. Definition**
Machine learning trains a model to find patterns in data and make predictions or decisions without writing a separate rule for every case.

**2. Three key ideas**
- **Supervised learning** uses labeled examples, such as predicting whether a customer will churn; **unsupervised learning** finds structure without labels, such as customer clusters.
- A model should be trained on one dataset and evaluated on unseen data. Overfitting happens when it memorizes training noise and performs poorly on new examples.
- Useful workflow: define the business problem, collect and clean data, split train/test sets, train a model, evaluate appropriate metrics, and monitor it after deployment.

**3. Business example**
A streaming service can use supervised learning to predict churn from viewing and subscription behavior. Marketing can then offer a relevant retention message, while measuring precision, recall, lift, and retention rather than accuracy alone.

**4. Practice example**
Design a churn project: choose the target label, list three input features, select a baseline, and explain why a false negative could be more costly than a false positive.`;
  }

  return `## Free Local Study Tutor: ${cleanMessage}

This answer was generated locally and did not require OpenAI billing.

**1. Definition**
${cleanMessage} is the main concept or question you asked about; begin by stating its meaning, scope, and purpose in your own words.

**2. Three key ideas**
- Identify the core principle and the vocabulary needed to explain it.
- Connect the principle to a cause-and-effect relationship, formula, or framework.
- Separate the concept from one common confusion or limitation.

**3. Business example**
Apply ${cleanMessage} to a real brand, product, market, or customer decision. State the decision, explain how the concept changes it, and name one metric that would measure the result.

**4. Practice example**
Choose a familiar business and write a four-line answer: definition, three key points, one practical example, and one limitation. Then explain how your answer would change for a different industry.`;
}

function getTutorTopic(message) {
  const cleanMessage = String(message || '').trim();
  const normalized = cleanMessage.toLowerCase();

  if (/swot/.test(normalized) && /nike/.test(normalized)) return 'SWOT Analysis of Nike';
  if (/swot/.test(normalized) && /apple/.test(normalized)) return 'SWOT Analysis of Apple';
  if (/swot/.test(normalized)) return 'SWOT Analysis';
  if (/seo/.test(normalized) && /sem/.test(normalized)) return 'SEO vs SEM';
  if (/4\s*p|4ps|marketing mix/.test(normalized)) return 'The 4Ps Marketing Mix';
  if (/stp|segmentation.*targeting.*positioning/.test(normalized)) return 'STP Marketing Framework';
  if (/\bgdp\b|gross domestic product/.test(normalized)) return 'Gross Domestic Product (GDP)';
  if (/elasticity/.test(normalized)) return 'Price Elasticity of Demand';
  if (/machine learning|\bml\b/.test(normalized)) return 'Machine Learning Basics';
  if (/^(hi|hello|hey|namaste)\b/i.test(cleanMessage)) return 'Welcome';

  return cleanMessage || 'the selected study topic';
}

function formatTutorResponse(content, message) {
  const topic = getTutorTopic(message);
  let answer = String(content || '').trim();

  answer = answer
    .replace(/^\s*(?:#+\s*)?Free Local Study Tutor(?::[^\n]*)?\s*/i, '')
    .replace(/^\s*#+[^\n]*\n+/i, '')
    .replace(/^\s*This (?:free )?local answer did not require OpenAI billing\.\s*/i, '')
    .replace(/^\s*This answer was generated locally and did not require OpenAI billing\.\s*/i, '')
    .replace(/^.*(?:OpenAI billing|external billing).*\n?/gim, '')
    .replace(/\bChatGPT\b/gi, 'the tutor')
    .replace(/\bcloud\b/gi, 'online service')
    .replace(/\bpaid API\b/gi, 'external service')
    .trim();

  if (!answer) {
    answer = createLegacyLocalTutorReply(message);
  }

  return `Free Local Study Tutor: ${topic}\n\n${answer}`;
}

const LOCAL_TUTOR_KNOWLEDGE = [
  {
    terms: ['photosynthesis', 'plant food process'],
    title: 'Photosynthesis',
    definition: 'Photosynthesis is the process in which green plants use sunlight, water, and carbon dioxide to make glucose and release oxygen.',
    keyIdeas: ['Chlorophyll captures light energy in plant cells.', 'Water and carbon dioxide are raw materials; glucose stores chemical energy.', 'The process supports plant growth and supplies oxygen to many living organisms.'],
    example: 'A crop uses sunlight and carbon dioxide during the day to produce food, so a farmer can improve growth by providing suitable light, water, and nutrients.',
    limitation: 'Photosynthesis slows when light, water, temperature, or carbon dioxide is unsuitable.'
  },
  {
    terms: ['economics'],
    title: 'Economics',
    definition: 'Economics studies how people, businesses, and governments use limited resources to satisfy unlimited wants and needs.',
    keyIdeas: ['Scarcity forces people to make choices.', 'Every choice has an opportunity cost.', 'Demand, supply, incentives, and institutions influence resource allocation.'],
    example: 'A business chooses whether to spend a limited budget on advertising or new equipment by comparing expected benefits and opportunity costs.',
    limitation: 'Economic models simplify human behavior and may not predict every real-world decision.'
  },
  {
    terms: ['management', 'business management'],
    title: 'Management',
    definition: 'Management is the process of planning, organizing, leading, and controlling resources to achieve goals effectively and efficiently.',
    keyIdeas: ['Planning sets objectives and actions.', 'Organizing assigns people, responsibilities, and resources.', 'Control compares results with goals and corrects problems.'],
    example: 'A marketing manager plans a campaign, assigns creative and analytics tasks, monitors conversions, and changes the budget when results fall below target.',
    limitation: 'Good management cannot guarantee success when market conditions or external risks change.'
  },
  {
    terms: ['accounting'],
    title: 'Accounting',
    definition: 'Accounting records, summarizes, and reports financial transactions so users can understand an organization\'s financial position and performance.',
    keyIdeas: ['Assets are resources, liabilities are obligations, and equity is the owner\'s claim.', 'The accounting equation is Assets = Liabilities + Equity.', 'Reports support decisions about profit, cash, risk, and investment.'],
    example: 'A shop records sales, inventory purchases, rent, and wages to calculate profit and understand whether the business is financially healthy.',
    limitation: 'Accounting reports depend on accurate records and may not show every non-financial factor, such as employee morale.'
  },
  {
    terms: ['artificial intelligence', 'what is ai', 'define ai', 'ai'],
    title: 'Artificial Intelligence',
    definition: 'Artificial intelligence is the field of creating computer systems that perform tasks such as recognizing patterns, understanding language, making predictions, and supporting decisions.',
    keyIdeas: ['Data provides examples from which algorithms learn patterns.', 'Training and evaluation test whether a model generalizes to new cases.', 'AI can assist people but needs human review because it can be inaccurate or biased.'],
    example: 'An online store can recommend products from browsing and purchase behavior, then measure recommendation clicks and completed purchases.',
    limitation: 'AI output is not automatically true; quality depends on data, model limits, context, and human verification.'
  },
  {
    terms: ['machine learning', 'supervised learning', 'unsupervised learning'],
    title: 'Machine Learning',
    definition: 'Machine learning is a branch of AI in which a model learns patterns from data to make predictions or decisions.',
    keyIdeas: ['Supervised learning uses labeled examples; unsupervised learning finds structure without labels.', 'Training data is used to fit a model and test data checks performance on unseen cases.', 'Overfitting occurs when a model memorizes training data instead of learning useful general patterns.'],
    example: 'A subscription company can predict which customers may cancel and send a relevant retention offer before cancellation.',
    limitation: 'A model can produce unfair or unreliable predictions when the data is incomplete, biased, or different from the training data.'
  },
  {
    terms: ['python programming', 'python language', 'programming', 'python'],
    title: 'Python Programming',
    definition: 'Python is a high-level programming language used to write readable instructions for automation, web applications, data analysis, and AI.',
    keyIdeas: ['Variables store values and functions organize reusable behavior.', 'Libraries extend Python for tasks such as data analysis and web development.', 'Testing and clear error handling make programs more reliable.'],
    example: 'A student can use Python to read a campaign dataset, calculate conversion rates, and create a report for a marketing decision.',
    limitation: 'Python still requires correct logic, secure dependencies, and suitable performance choices for large or time-sensitive systems.'
  },
  {
    terms: ['html'],
    title: 'HTML',
    definition: 'HTML is the markup language used to structure content on web pages, including headings, paragraphs, links, images, and forms.',
    keyIdeas: ['Elements describe the meaning and structure of content.', 'Attributes provide additional information such as an image source or link destination.', 'Semantic HTML improves accessibility, maintainability, and search understanding.'],
    example: 'A study page can use a heading for the topic, paragraphs for explanations, and a form for students to submit questions.',
    limitation: 'HTML defines structure but does not by itself provide visual styling or application behavior.'
  },
  {
    terms: ['database'],
    title: 'Database',
    definition: 'A database is an organized collection of data that software can store, search, update, and manage.',
    keyIdeas: ['Tables or collections organize related records.', 'Queries retrieve or change selected data.', 'Constraints, backups, and access controls protect accuracy and availability.'],
    example: 'A tutoring app can store student accounts, chat history, courses, and quiz results so each student sees relevant progress.',
    limitation: 'A database cannot fix incorrect input and requires careful security, backups, and design as the system grows.'
  },
  {
    terms: ['inflation'],
    title: 'Inflation',
    definition: 'Inflation is a sustained increase in the general price level, which reduces the purchasing power of money over time.',
    keyIdeas: ['Demand-pull inflation occurs when demand grows faster than supply.', 'Cost-push inflation can follow higher input, energy, or labor costs.', 'Real values remove price effects; nominal values use current prices.'],
    example: 'A retailer may review prices, wages, and product sizes when supplier costs rise, while monitoring whether customers reduce purchases.',
    limitation: 'A single inflation rate does not represent every household\'s actual basket of goods or financial situation.'
  }
];

function createLocalKnowledgeReply(message) {
  const normalizedMessage = String(message || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  const topic = LOCAL_TUTOR_KNOWLEDGE.find((entry) => entry.terms.some((term) => normalizedMessage.includes(term)));

  if (!topic) return null;

  return `**1. Definition**
${topic.definition}

**2. Three key ideas**
- ${topic.keyIdeas[0]}
- ${topic.keyIdeas[1]}
- ${topic.keyIdeas[2]}

**3. Business example**
${topic.example}

**4. Practice example**
Definition: ${topic.definition}
Three key points: ${topic.keyIdeas.join(' ')}
Practical example: ${topic.example}
Limitation: ${topic.limitation}`;
}

function createLocalTutorReply(message) {
  return formatTutorResponse(createLocalKnowledgeReply(message) || createLegacyLocalTutorReply(message), message);
}

function handleAiError(res, err, fallbackMsg, requestMessage) {
  const status = Number(err && err.status ? err.status : 500);
  const errorCode = err && err.code ? err.code : 'unknown';
  const message = (err && err.message) || 'AI service encountered an unexpected error.';

  console.error('[AI Error]', {
    status,
    code: errorCode,
    message
  });

  if (LOCAL_TUTOR_FALLBACK && requestMessage) {
    return res.json({
      success: true,
      reply: formatTutorResponse(createLocalTutorReply(requestMessage), requestMessage),
      source: 'local-fallback',
      provider: AI_PROVIDER
    });
  }

  return res.status(status >= 400 && status < 600 ? status : 500).json({
    success: false,
    error: fallbackMsg || 'Failed to generate AI response. Please try again.',
    code: errorCode
  });
}

function createLocalPresentationSlides(topic, subject, count, language) {
  const title = String(topic || 'the selected topic').trim();
  const deckSubject = String(subject || 'Digital Marketing & Business').trim();
  const deckLanguage = String(language || 'English').trim();
  const slideTemplates = [
    {
      title,
      bullets: [`${title} in ${deckSubject}`, 'Purpose, scope, and why the topic matters', `Language: ${deckLanguage}`],
      speakerNotes: `Introduce ${title} and explain why it matters to students and business decision-makers.`,
      visualIdea: 'Title slide with a clear concept map and one relevant business image.'
    },
    {
      title: 'Definition and Context',
      bullets: [`${title} is the central concept being studied`, 'Identify its purpose, users, and business context', 'Connect the topic to a customer, market, or organizational decision'],
      speakerNotes: `Define ${title} in simple language, then place it in its academic and business context.`,
      visualIdea: 'Definition callout beside a simple context diagram.'
    },
    {
      title: 'Key Ideas and Framework',
      bullets: ['Identify the three to five ideas that explain the topic', 'Show how the ideas relate through a process or framework', 'Separate assumptions, evidence, and limitations'],
      speakerNotes: 'Explain the framework step by step and connect each idea to the next one.',
      visualIdea: 'Three-part process diagram with arrows and short labels.'
    },
    {
      title: 'Business Example',
      bullets: [`Apply ${title} to a real brand, product, or market`, 'Describe the decision the business must make', 'Explain the expected result and one metric for evaluation'],
      speakerNotes: `Use a concrete business example to show how ${title} changes strategy or execution.`,
      visualIdea: 'Case-study layout with company, decision, action, and outcome sections.'
    },
    {
      title: 'Practical Application',
      bullets: ['Translate the concept into an actionable plan', 'List the data, resources, or skills required', 'Note one implementation challenge and a mitigation'],
      speakerNotes: 'Move from theory to action by showing what a student or manager would do next.',
      visualIdea: 'Checklist or implementation roadmap with milestones.'
    },
    {
      title: 'Summary and Discussion',
      bullets: ['Remember the definition and three key ideas', 'Use the business example as a memory anchor', 'Discuss one limitation and one question for further study'],
      speakerNotes: `Close by revisiting the main lesson from ${title} and inviting questions or comparison with another topic.`,
      visualIdea: 'Summary card with three takeaways and two discussion prompts.'
    }
  ];

  return slideTemplates.slice(0, count).map((slide, index) => ({
    slideNumber: index + 1,
    ...slide
  }));
}

function createLocalCareerRoadmap(careerGoal, targetField, experienceLevel, interests) {
  const goal = String(careerGoal || 'Digital Marketing Strategist').trim();
  const field = String(targetField || 'Digital Marketing & AI').trim();
  const level = String(experienceLevel || 'Undergraduate Student').trim();
  const focus = String(interests || 'Campaign strategy, data analytics, and generative AI').trim();

  return {
    roleTitle: goal,
    overview: `This six-month roadmap helps an ${level.toLowerCase()} build practical evidence for a career as a ${goal} in ${field}. It combines fundamentals, hands-on projects, measurable outcomes, and interview preparation around ${focus}.`,
    targetIndustry: field,
    milestones: [
      {
        phase: 'Month 1-2: Foundations',
        goal: 'Build the core knowledge and tools for the target role.',
        tasks: [
          `Study the fundamentals of ${field} and create a glossary of 30 essential terms.`,
          'Learn spreadsheet analysis, basic presentation design, and one analytics platform.',
          'Review five strong campaigns or case studies and explain the business objective behind each.'
        ]
      },
      {
        phase: 'Month 3-4: Applied Skills',
        goal: 'Create portfolio evidence using a realistic business problem.',
        tasks: [
          `Build a small project connected to ${goal}, such as a campaign audit, content plan, or dashboard.`,
          'Define a target audience, success metrics, timeline, and budget assumptions.',
          'Publish a short case study showing your process, decisions, and measurable recommendations.'
        ]
      },
      {
        phase: 'Month 5-6: Job and Interview Preparation',
        goal: 'Turn project work into applications and confident interviews.',
        tasks: [
          'Rewrite your resume around outcomes, metrics, tools, and specific contributions.',
          'Complete two mock interviews using the STAR method and record improvement notes.',
          'Contact professionals or alumni, request feedback, and apply to targeted internships or entry-level roles.'
        ]
      }
    ],
    recommendedProjects: [
      {
        name: 'Brand Growth Audit',
        description: `Analyze a real ${field} brand, identify a customer or funnel problem, and recommend a 30-day improvement plan.`,
        techStack: 'Google Sheets or Excel, presentation slides, optional analytics dashboard',
        portfolioImpact: 'Demonstrates structured thinking, market analysis, communication, and business judgment.'
      },
      {
        name: 'Campaign Experiment Dashboard',
        description: 'Create a sample campaign dataset, calculate CTR, conversion rate, CAC, and ROAS, then explain which decision the data supports.',
        techStack: 'Excel or Google Sheets, Looker Studio or Power BI, optional Python',
        portfolioImpact: 'Shows that you can connect marketing activity to measurable commercial outcomes.'
      }
    ],
    skillsChecklist: [
      'Market and customer research',
      'Segmentation, targeting, and positioning',
      'Content and campaign planning',
      'Analytics and KPI interpretation',
      'Spreadsheet and dashboard skills',
      'Presentation and business writing',
      'Generative AI workflow and responsible use',
      'Interview communication using STAR'
    ],
    interviewQuestions: [
      {
        question: 'Tell me about a project where you used data to make a recommendation.',
        guidance: 'Use STAR: describe the business situation, the task, the analysis you performed, and the measurable or expected result.'
      },
      {
        question: 'How would you improve a campaign that has high clicks but few conversions?',
        guidance: 'Check tracking first, then examine landing-page relevance, offer clarity, audience intent, page speed, and conversion friction. Propose one controlled test.'
      },
      {
        question: 'Why are you interested in this role and field?',
        guidance: `Connect your interest in ${focus} to the role, then support it with one portfolio project and one skill you are actively improving.`
      }
    ]
  };
}

const isLocalOrigin = (origin) => {
  if (!origin) return true;
  return /^(https?:\/\/)(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
};

app.use(cors({
  origin: (origin, callback) => {
    if (isLocalOrigin(origin)) {
      callback(null, true);
      return;
    }
    console.warn(`[CORS] Blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use((req, res, next) => {
  if (req.headers['access-control-request-private-network']) {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '1mb' }));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Malformed JSON payload received by server.'
    });
  }
  next(err);
});

app.use(express.static(path.join(__dirname, 'public')));

const STUDYSMART_SYSTEM_PROMPT = `You are Free Local Study Tutor, a completely offline, zero-cost academic tutor. Answer questions from any subject in simple, clear, student-friendly English or Hinglish.

Do not add system commentary, provider commentary, or billing commentary.

Always use exactly this structure and order, with no extra sections:

Free Local Study Tutor: [TOPIC]

1. Definition
Write a clear, simple definition of the concept in your own words. Explain its meaning, scope, and purpose.

2. Three key ideas
• State the core principle and important vocabulary.
• Connect the principle to a cause-and-effect relationship, formula, process, or framework.
• Separate the concept from one common confusion or limitation.

3. Business example
Apply the concept to a real brand, product, market, or customer decision. State the decision, explain how the concept changes it, and name one clear metric that measures the result.

4. Practice example
Write exactly four lines: Definition; three brief key points; one practical example; one limitation. Then write 2–3 lines explaining how the answer would change in a different industry.

For greetings such as hi, hello, hey, or namaste, reply warmly as a tutor but keep the same four numbered sections. Fill every section with useful, natural content rather than a generic template.`;

app.get('/api/health', (req, res) => {
  const providerStatus = AI_PROVIDER === 'ollama' ? 'ollama' : isApiKeyConfigured ? 'openai' : 'local-free';

  res.json({
    status: 'healthy',
    platform: 'StudySmart AI',
    version: '2.0.0',
    provider: providerStatus,
    model: getProviderModelName(AI_PROVIDER),
    isConfigured: isApiKeyConfigured || AI_PROVIDER !== 'openai',
    openaiAvailable: Boolean(openai),
    localTutorAvailable: true,
    mode: AI_PROVIDER === 'openai' ? 'openai' : 'local-free',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body || {};

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Message parameter is required and cannot be empty.'
      });
    }

    if (message.length > 4000) {
      return res.status(400).json({
        success: false,
        error: 'Message exceeds the 4000 character limit.'
      });
    }

    const messages = [{ role: 'system', content: STUDYSMART_SYSTEM_PROMPT }];

    if (Array.isArray(history)) {
      for (const turn of history.slice(-8)) {
        if (turn && (turn.role === 'user' || turn.role === 'assistant') && typeof turn.content === 'string') {
          messages.push({ role: turn.role, content: turn.content.slice(0, 3000) });
        }
      }
    }

    messages.push({ role: 'user', content: message.trim() });

    const result = await generateChatCompletion({
      messages,
      temperature: 0.7,
      max_tokens: 1500
    });

    return res.json({
      success: true,
      reply: formatTutorResponse(result.content || createLocalTutorReply(message), message)
    });
  } catch (err) {
    return handleAiError(
      res,
      err,
      'Failed to generate an AI tutor response.',
      req.body && typeof req.body.message === 'string' ? req.body.message : ''
    );
  }
});

app.post('/api/generate-notes', async (req, res) => {
  try {
    const { subject, topic, level, language, style } = req.body || {};

    if (!topic || typeof topic !== 'string' || topic.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Topic parameter is required.'
      });
    }

    const targetSubject = subject ? String(subject).trim() : 'BBA & Digital Marketing';
    const targetTopic = topic.trim();
    const targetLevel = level ? String(level).trim() : 'Undergraduate College';
    const targetLanguage = language ? String(language).trim() : 'English';
    const targetStyle = style ? String(style).trim() : 'Comprehensive Revision Notes';

    const notesPrompt = `You are a university professor creating high-yield academic study notes for undergraduate students.

Subject: ${targetSubject}
Topic: ${targetTopic}
Academic Level: ${targetLevel}
Preferred Language: ${targetLanguage}
Notes Style: ${targetStyle}

Please generate structured revision notes with the following sections in Markdown:
1. # ${targetTopic} — Executive Academic Overview
2. ## 🎯 Core Learning Objectives
3. ## 🔑 Key Theoretical Principles & Frameworks
4. ## 📊 Relevant Formulas, Metrics & Calculations (if applicable)
5. ## 🏢 Real-World Industry Case Study / Practical Application
6. ## ⚡ Step-by-Step Breakdown & Nuances
7. ## 📝 High-Yield Exam Revision Summary (Bullet Points)
8. ## 💡 Memory Triggers & Mnemonics for Exam Recall`;

    const result = await generateChatCompletion({
      messages: [
        { role: 'system', content: STUDYSMART_SYSTEM_PROMPT },
        { role: 'user', content: notesPrompt }
      ],
      temperature: 0.6,
      max_tokens: 2200
    });

    return res.json({
      success: true,
      notes: String(result.content || '').trim(),
      subject: targetSubject,
      topic: targetTopic
    });
  } catch (err) {
    return handleAiError(res, err, 'Failed to generate study notes.');
  }
});

app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { topic, subject, count, difficulty } = req.body || {};

    if (!topic || typeof topic !== 'string' || topic.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Topic parameter is required.'
      });
    }

    const quizTopic = topic.trim();
    const quizSubject = subject ? String(subject).trim() : 'Digital Marketing & AI';
    const qCount = Math.min(Math.max(parseInt(count, 10) || 5, 3), 10);
    const qDiff = difficulty ? String(difficulty).trim() : 'Medium';

    const prompt = `Generate an interactive multiple-choice quiz of exactly ${qCount} questions on the topic "${quizTopic}" in the subject "${quizSubject}" with ${qDiff} difficulty level for college students.

Return ONLY a valid raw JSON array of objects. Do not include markdown code fences or commentary.

JSON Schema for every question object:
{
  "question": "Clear, challenging question text?",
  "options": [
    "Option A text",
    "Option B text",
    "Option C text",
    "Option D text"
  ],
  "correctIndex": 0,
  "explanation": "Detailed 2-3 sentence academic explanation of why this answer is correct."
}

Ensure exactly 4 options per question and a valid integer correctIndex between 0 and 3.`;

    const result = await generateChatCompletion({
      messages: [
        { role: 'system', content: 'You are an educational examination system that outputs strictly valid JSON arrays without markdown wrappers.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 2500
    });

    let rawText = String(result.content || '[]').trim();
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let parsedQuestions = [];
    try {
      parsedQuestions = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('[Quiz JSON Parse Error]:', parseErr.message, 'Raw:', rawText);
      return res.status(502).json({
        success: false,
        error: 'Failed to parse AI quiz response as valid JSON. Please try again.'
      });
    }

    if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
      return res.status(502).json({
        success: false,
        error: 'AI returned an invalid question structure.'
      });
    }

    const sanitizedQuestions = parsedQuestions
      .filter(q => q && typeof q.question === 'string' && Array.isArray(q.options) && q.options.length === 4)
      .map((q, idx) => {
        let cIdx = parseInt(q.correctIndex, 10);
        if (Number.isNaN(cIdx) || cIdx < 0 || cIdx > 3) cIdx = 0;
        return {
          id: `ai_q_${idx + 1}_${Date.now()}`,
          question: String(q.question).trim(),
          options: q.options.map(opt => String(opt).trim()),
          correctIndex: cIdx,
          explanation: typeof q.explanation === 'string' ? q.explanation.trim() : 'Correct answer explanation provided.'
        };
      });

    return res.json({
      success: true,
      topic: quizTopic,
      questions: sanitizedQuestions
    });
  } catch (err) {
    return handleAiError(res, err, 'Failed to generate custom quiz.');
  }
});

app.post('/api/generate-ppt', async (req, res) => {
  try {
    const { topic, subject, slideCount, language, level, requirements } = req.body || {};

    if (!topic || typeof topic !== 'string' || topic.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Topic parameter is required.'
      });
    }

    const count = Math.min(Math.max(parseInt(slideCount, 10) || 6, 3), 12);
    const pptSubject = subject ? String(subject).trim() : 'Digital Marketing & Business';
    const pptTopic = topic.trim();
    const pptLang = language ? String(language).trim() : 'English';
    const pptLevel = level ? String(level).trim() : 'Undergraduate / BBA';
    const pptReq = requirements ? String(requirements).trim() : 'Focus on real-world industry case studies, practical strategies, and visual slide design.';

    const prompt = `Create a professional presentation deck of exactly ${count} slides on:
Topic: "${pptTopic}"
Subject: "${pptSubject}"
Academic Level: "${pptLevel}"
Language: "${pptLang}"
Special Requirements: "${pptReq}"

Return ONLY a raw valid JSON array of slide objects without markdown fences.`;

    const result = await generateChatCompletion({
      messages: [
        { role: 'system', content: 'You are an executive presentation designer. Return strictly valid JSON arrays without markdown wrappers.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.6,
      max_tokens: 2800
    });

    let rawText = String(result.content || '[]').trim();
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let slides = [];
    try {
      slides = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('[PPT JSON Parse Error]:', parseErr.message, 'Raw:', rawText);
      if (LOCAL_TUTOR_FALLBACK) {
        return res.json({
          success: true,
          topic: pptTopic,
          subject: pptSubject,
          slideCount: count,
          slides: createLocalPresentationSlides(pptTopic, pptSubject, count, pptLang),
          source: 'local-fallback'
        });
      }
      return res.status(502).json({
        success: false,
        error: 'Failed to parse AI presentation content as valid JSON. Please try again.'
      });
    }

    if (!Array.isArray(slides) || slides.length === 0) {
      if (LOCAL_TUTOR_FALLBACK) {
        return res.json({
          success: true,
          topic: pptTopic,
          subject: pptSubject,
          slideCount: count,
          slides: createLocalPresentationSlides(pptTopic, pptSubject, count, pptLang),
          source: 'local-fallback'
        });
      }
      return res.status(502).json({
        success: false,
        error: 'AI returned an invalid presentation structure.'
      });
    }

    const sanitizedSlides = slides.map((s, idx) => ({
      slideNumber: s.slideNumber || (idx + 1),
      title: String(s.title || `Slide ${idx + 1}`).trim(),
      bullets: Array.isArray(s.bullets) ? s.bullets.map(b => String(b).trim()) : ['Key takeaway not provided.'],
      speakerNotes: String(s.speakerNotes || 'Speak clearly about the core concepts on this slide.').trim(),
      visualIdea: String(s.visualIdea || 'Clean minimalist infographic layout with key metric callouts.').trim()
    }));

    return res.json({
      success: true,
      topic: pptTopic,
      subject: pptSubject,
      slideCount: sanitizedSlides.length,
      slides: sanitizedSlides
    });
  } catch (err) {
    if (LOCAL_TUTOR_FALLBACK) {
      const body = req.body || {};
      const fallbackTopic = typeof body.topic === 'string' ? body.topic.trim() : 'the selected topic';
      const fallbackSubject = typeof body.subject === 'string' ? body.subject.trim() : 'Digital Marketing & Business';
      const fallbackLanguage = typeof body.language === 'string' ? body.language.trim() : 'English';
      const fallbackCount = Math.min(Math.max(parseInt(body.slideCount, 10) || 6, 3), 12);

      console.warn('[PPT] AI provider unavailable; returning built-in local slide deck.');
      return res.json({
        success: true,
        topic: fallbackTopic,
        subject: fallbackSubject,
        slideCount: fallbackCount,
        slides: createLocalPresentationSlides(fallbackTopic, fallbackSubject, fallbackCount, fallbackLanguage),
        source: 'local-fallback'
      });
    }
    return handleAiError(res, err, 'Failed to generate presentation slides.');
  }
});

app.post('/api/generate-career', async (req, res) => {
  try {
    const { careerGoal, targetField, experienceLevel, interests } = req.body || {};

    if (!careerGoal || typeof careerGoal !== 'string' || careerGoal.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Career goal parameter is required.'
      });
    }

    const goal = careerGoal.trim();
    const field = targetField ? String(targetField).trim() : 'Digital Marketing & AI';
    const exp = experienceLevel ? String(experienceLevel).trim() : 'Undergraduate Student';
    const userInterests = interests ? String(interests).trim() : 'Campaign Strategy, Data Analytics, Generative AI';

    const prompt = `You are a university career counselor and executive tech mentor designing a structured 6-month career readiness roadmap for a college student.
Target Career Goal: "${goal}"
Field / Industry: "${field}"
Current Student Level: "${exp}"
Interests: "${userInterests}"

Output strictly valid JSON with this schema: {
  "roleTitle": "Exact Professional Title",
  "overview": "2-sentence summary",
  "targetIndustry": "${field}",
  "milestones": [
    { "phase": "Month 1-2: Foundations", "goal": "Core knowledge acquisition", "tasks": ["Task 1", "Task 2"] }
  ],
  "recommendedProjects": [{ "name": "Project", "description": "Practical project", "techStack": "Tools", "portfolioImpact": "Why it matters" }],
  "skillsChecklist": ["Skill 1", "Skill 2"],
  "interviewQuestions": [{ "question": "Question?", "guidance": "How to answer using STAR." }]
}`;

    const result = await generateChatCompletion({
      messages: [
        { role: 'system', content: 'You are a career guidance expert. Output strictly valid JSON without markdown formatting.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.6,
      max_tokens: 2800
    });

    let rawText = String(result.content || '{}').trim();
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let roadmap = {};
    try {
      roadmap = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('[Career JSON Parse Error]:', parseErr.message, 'Raw:', rawText);
      if (LOCAL_TUTOR_FALLBACK) {
        return res.json({
          success: true,
          careerGoal: goal,
          roadmap: createLocalCareerRoadmap(goal, field, exp, userInterests),
          source: 'local-fallback'
        });
      }
      return res.status(502).json({
        success: false,
        error: 'Failed to parse AI career guidance as valid JSON. Please try again.'
      });
    }

    return res.json({
      success: true,
      careerGoal: goal,
      roadmap
    });
  } catch (err) {
    if (LOCAL_TUTOR_FALLBACK) {
      const body = req.body || {};
      const fallbackGoal = typeof body.careerGoal === 'string' ? body.careerGoal.trim() : 'Digital Marketing Strategist';
      const fallbackField = typeof body.targetField === 'string' ? body.targetField.trim() : 'Digital Marketing & AI';
      const fallbackLevel = typeof body.experienceLevel === 'string' ? body.experienceLevel.trim() : 'Undergraduate Student';
      const fallbackInterests = typeof body.interests === 'string' ? body.interests.trim() : 'Campaign strategy, data analytics, and generative AI';

      console.warn('[Career] AI provider unavailable; returning built-in local career roadmap.');
      return res.json({
        success: true,
        careerGoal: fallbackGoal,
        roadmap: createLocalCareerRoadmap(fallbackGoal, fallbackField, fallbackLevel, fallbackInterests),
        source: 'local-fallback'
      });
    }
    return handleAiError(res, err, 'Failed to generate career plan.');
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(PORT, HOST, () => {
  console.log('===================================================');
  console.log(`🚀 StudySmart AI Server is running on port ${PORT}`);
  console.log(`🌐 Local Web App: http://${HOST}:${PORT}`);
  console.log(`🤖 AI Status: ${AI_PROVIDER === 'openai' && isApiKeyConfigured ? `Live OpenAI API Configured (${OPENAI_MODEL})` : 'Free Local Provider Active (Ollama default)'}`);
  console.log('===================================================');
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`[Startup] Port ${PORT} is already in use. Stop the running process or set a different PORT in .env. Current HOST=${HOST}.`);
  } else {
    console.error('[Startup] Failed to start server:', err);
  }
  process.exit(1);
});

module.exports = app;
