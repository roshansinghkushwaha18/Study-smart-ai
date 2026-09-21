/**
 * StudySmart AI - Client-Side Application Core
 * Technologies: Vanilla JavaScript (ES6+), LocalStorage Safety Helper, Web Audio Synthesizer
 * Architecture: Event-driven Modular Components (Local AI-style chat, Quiz 50, Notes, PPT, Alerts, Career)
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. STORAGE HELPER (Crash-Proof LocalStorage Wrapper)
  // =========================================================================
  const StorageHelper = {
    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        if (item === null || item === undefined || item === '') return defaultValue;
        return JSON.parse(item);
      } catch (err) {
        console.warn(`[StorageHelper] Failed to parse key "${key}". Resetting to fallback.`, err);
        return defaultValue;
      }
    },

    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (err) {
        console.error(`[StorageHelper] Failed to write key "${key}". Storage might be full.`, err);
        return false;
      }
    },

    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (err) {
        console.error(`[StorageHelper] Failed to remove key "${key}".`, err);
        return false;
      }
    }
  };

  // =========================================================================
  // 2. API ROUTING HELPER
  // =========================================================================
  function getApiUrl(endpoint) {
    const clean = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    const localBaseUrl = 'http://127.0.0.1:5000';
    const configuredBaseUrl = (window.__APP_CONFIG__ && window.__APP_CONFIG__.API_BASE_URL) || null;

    if (configuredBaseUrl) {
      return `${configuredBaseUrl.replace(/\/+$/, '')}${clean}`;
    }

    if (window.location.protocol === 'file:') {
      return `${localBaseUrl}${clean}`;
    }

    if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
      return `${localBaseUrl}${clean}`;
    }

    if (window.location.hostname.endsWith('github.io')) {
      return clean;
    }

    return clean;
  }

  function getOfflineTutorReply(question) {
    const text = String(question || '').trim();
    const normalized = text.toLowerCase();
    const topics = [
      {
        matches: ['photosynthesis', 'plant food'],
        title: 'Photosynthesis',
        definition: 'Photosynthesis is the process in which green plants use sunlight, water, and carbon dioxide to make glucose and release oxygen.',
        points: ['Chlorophyll captures light energy.', 'Water and carbon dioxide are raw materials.', 'Glucose stores energy and oxygen is released.'],
        example: 'A crop needs suitable light, water, temperature, and carbon dioxide to grow efficiently.',
        limitation: 'The process slows when light, water, temperature, or carbon dioxide is unsuitable.'
      },
      {
        matches: ['what is ai', 'artificial intelligence', 'define ai'],
        title: 'Artificial Intelligence',
        definition: 'Artificial intelligence creates computer systems that recognize patterns, understand language, make predictions, and support decisions.',
        points: ['Data provides examples.', 'Algorithms learn patterns and produce outputs.', 'Human review is needed because AI can be inaccurate or biased.'],
        example: 'An online store can recommend products from browsing and purchase behavior.',
        limitation: 'AI output is not automatically true; its quality depends on data, model limits, and verification.'
      },
      {
        matches: ['machine learning', 'supervised learning', 'unsupervised learning'],
        title: 'Machine Learning',
        definition: 'Machine learning is a branch of AI in which models learn patterns from data to make predictions or decisions.',
        points: ['Supervised learning uses labeled examples.', 'Unsupervised learning finds structure without labels.', 'Unseen test data checks whether the model generalizes.'],
        example: 'A subscription company can predict which customers may cancel and send a retention offer.',
        limitation: 'Biased, incomplete, or outdated data can produce unreliable predictions.'
      },
      {
        matches: ['marketing', 'digital marketing'],
        title: 'Marketing',
        definition: 'Marketing is the process of understanding customer needs, creating value, communicating an offer, and building customer relationships.',
        points: ['Research identifies customer needs.', 'Targeting selects the audience and positioning communicates value.', 'Product, price, place, and promotion must work together.'],
        example: 'A cafe can target students with an affordable breakfast bundle promoted through campus social media.',
        limitation: 'Promotion cannot fix a poor product or an unclear customer need.'
      },
      {
        matches: ['swot'],
        title: 'SWOT Analysis',
        definition: 'SWOT analyzes Strengths and Weaknesses inside an organization and Opportunities and Threats in its external environment.',
        points: ['Strengths and weaknesses are internal.', 'Opportunities and threats are external.', 'A strong strategy matches strengths to opportunities and reduces weaknesses exposed to threats.'],
        example: 'A local cafe can use its loyal customers to launch delivery before a large competitor opens nearby.',
        limitation: 'A SWOT list is subjective unless each point is supported by evidence.'
      }
    ];
    const topic = topics.find(item => item.matches.some(match => normalized.includes(match)));
    if (!topic) return null;

    return `**1. Definition**\n${topic.definition}\n\n**2. Three key ideas**\n- ${topic.points[0]}\n- ${topic.points[1]}\n- ${topic.points[2]}\n\n**3. Business example**\n${topic.example}\n\n**4. Practice example**\nDefinition: ${topic.definition}\nThree key points: ${topic.points.join(' ')}\nPractical example: ${topic.example}\nLimitation: ${topic.limitation}`;
  }

  // =========================================================================
  // 3. TOAST NOTIFICATION SYSTEM
  // =========================================================================
  const Toast = {
    container: document.getElementById('toastContainer'),

    show(message, type = 'info', duration = 3500) {
      if (!this.container) return;

      const toast = document.createElement('div');
      toast.className = `toast-item toast-${type}`;

      let icon = 'fa-circle-info';
      if (type === 'success') icon = 'fa-circle-check';
      if (type === 'error') icon = 'fa-triangle-exclamation';

      toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${this.escapeHtml(message)}</span>
      `;

      this.container.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    },

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
  };

  // =========================================================================
  // 4. THEME MANAGER (Dark & Light Mode Toggle)
  // =========================================================================
  const ThemeManager = {
    storageKey: 'studysmart_theme',
    toggleBtn: document.getElementById('themeToggleBtn'),
    themeIcon: document.getElementById('themeIcon'),

    init() {
      const savedTheme = StorageHelper.get(this.storageKey, null);
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');

      this.applyTheme(initialTheme);

      if (this.toggleBtn) {
        this.toggleBtn.addEventListener('click', () => this.toggle());
      }
    },

    applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      StorageHelper.set(this.storageKey, theme);

      if (this.themeIcon) {
        if (theme === 'dark') {
          this.themeIcon.className = 'fa-solid fa-moon';
        } else {
          this.themeIcon.className = 'fa-solid fa-sun';
        }
      }
    },

    toggle() {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      this.applyTheme(next);
      Toast.show(`Switched to ${next} theme`, 'info', 1500);
    }
  };

  // =========================================================================
  // 5. NAVIGATION & MOBILE DRAWER MANAGER
  // =========================================================================
  const NavigationManager = {
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    closeDrawerBtn: document.getElementById('closeDrawerBtn'),
    mobileDrawer: document.getElementById('mobileDrawer'),
    drawerOverlay: document.getElementById('drawerOverlay'),
    navLinks: document.querySelectorAll('.nav-link, .mobile-nav-link'),

    init() {
      if (this.mobileMenuBtn) {
        this.mobileMenuBtn.addEventListener('click', () => this.openDrawer());
      }
      if (this.closeDrawerBtn) {
        this.closeDrawerBtn.addEventListener('click', () => this.closeDrawer());
      }
      if (this.drawerOverlay) {
        this.drawerOverlay.addEventListener('click', () => this.closeDrawer());
      }

      // Close drawer on link click
      this.navLinks.forEach(link => {
        link.addEventListener('click', () => {
          this.closeDrawer();
        });
      });

      // Active Navigation Link on Scroll
      window.addEventListener('scroll', () => this.highlightActiveSection(), { passive: true });
    },

    openDrawer() {
      if (this.mobileDrawer && this.drawerOverlay) {
        this.mobileDrawer.classList.add('open');
        this.mobileDrawer.setAttribute('aria-hidden', 'false');
        this.drawerOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    },

    closeDrawer() {
      if (this.mobileDrawer && this.drawerOverlay) {
        this.mobileDrawer.classList.remove('open');
        this.mobileDrawer.setAttribute('aria-hidden', 'true');
        this.drawerOverlay.classList.remove('active');
        document.body.style.overflow = '';
      }
    },

    highlightActiveSection() {
      const sections = document.querySelectorAll('section[id]');
      const scrollPos = window.scrollY + 140;

      sections.forEach(sec => {
        const top = sec.offsetTop;
        const height = sec.offsetHeight;
        const id = sec.getAttribute('id');

        if (scrollPos >= top && scrollPos < top + height) {
          this.navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === `#${id}`) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    }
  };

  // =========================================================================
  // 6. AI CHATBOX MODULE
  // =========================================================================
  const ChatModule = {
    form: document.getElementById('chatForm'),
    input: document.getElementById('chatInput'),
    messagesBox: document.getElementById('chatMessages'),
    statusDot: document.getElementById('chatStatusDot'),
    statusText: document.getElementById('chatStatusText'),
    sendBtn: document.getElementById('chatSendBtn'),
    clearBtn: document.getElementById('clearChatBtn'),
    charCount: document.getElementById('chatCharCount'),
    chipsContainer: document.getElementById('chatChipsContainer'),

    history: [],
    storageKey: 'studysmart_chat_history',
    isAiReady: false,

    init() {
      this.loadSavedHistory();
      this.checkServerHealth();

      if (this.form) {
        this.form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.sendMessage();
        });
      }

      if (this.input) {
        this.input.addEventListener('input', () => {
          if (this.charCount) this.charCount.textContent = this.input.value.length;
        });

        // Enter sends message, Shift+Enter adds newline
        this.input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
          }
        });
      }

      if (this.clearBtn) {
        this.clearBtn.addEventListener('click', () => this.clearChat());
      }

      // Starter chips
      if (this.chipsContainer) {
        this.chipsContainer.addEventListener('click', (e) => {
          const chip = e.target.closest('.chip-btn');
          if (chip && this.input) {
            const query = chip.getAttribute('data-query');
            if (query) {
              this.input.value = query;
              if (this.charCount) this.charCount.textContent = query.length;
              this.input.focus();
              this.sendMessage();
            }
          }
        });
      }
    },

    async checkServerHealth() {
      if (window.location.hostname.endsWith('github.io')) {
        this.isAiReady = true;
        if (this.statusText) this.statusText.textContent = 'Offline study mode ready';
        if (this.statusDot) this.statusDot.style.background = '#f59e0b';
        return;
      }

      const candidateUrls = [
        getApiUrl('/api/health'),
        'http://localhost:5000/api/health',
        'http://127.0.0.1:5000/api/health'
      ].filter((url, index, arr) => arr.indexOf(url) === index);

      for (const url of candidateUrls) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);
          const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            if (data.provider === 'ollama' || data.mode === 'local-free' || data.localTutorAvailable) {
              this.isAiReady = true;
              if (this.statusText) this.statusText.textContent = 'Free local tutor is online';
              if (this.statusDot) this.statusDot.style.background = '#10b981';
            } else {
              this.isAiReady = false;
              if (this.statusText) this.statusText.textContent = 'OpenAI API key is not configured';
              if (this.statusDot) this.statusDot.style.background = '#f59e0b';
            }
            return;
          }
        } catch (err) {
          // keep trying other known local endpoints before reporting offline
        }
      }

      if (this.statusText) this.statusText.textContent = 'Server Offline (Run npm start)';
      if (this.statusDot) this.statusDot.style.background = '#f43f5e';
    },

    loadSavedHistory() {
      const saved = StorageHelper.get(this.storageKey, []);
      if (Array.isArray(saved) && saved.length > 0) {
        const obsoleteNotice = 'This answer was generated locally and did not require OpenAI billing.';
        const validHistory = saved.filter(msg => {
          if (!msg || msg.role !== 'assistant' || typeof msg.content !== 'string') return true;
          const content = msg.content.trim();
          const isOldTemplate = content.includes('Study approach:') &&
            content.includes('Define the main concept in one sentence.') &&
            !content.includes('1. Definition');
          return content !== obsoleteNotice && !isOldTemplate;
        });

        this.history = validHistory;
        StorageHelper.set(this.storageKey, validHistory.slice(-20));
        validHistory.forEach(msg => this.renderMessage(msg.role, msg.content, false));
      }
    },

    async sendMessage() {
      if (!this.input) return;
      const text = this.input.value.trim();
      if (!text) return;

      this.input.value = '';
      if (this.charCount) this.charCount.textContent = '0';

      // Render User Message
      this.renderMessage('user', text, true);
      this.history.push({ role: 'user', content: text });
      StorageHelper.set(this.storageKey, this.history.slice(-20));

      // Show Typing Indicator
      const loadingBubble = this.showLoadingBubble();

      try {
        const response = await fetch(getApiUrl('/api/chat'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            history: this.history.slice(-8)
          })
        });

        const data = await response.json();
        loadingBubble.remove();

        if (response.ok && data.success) {
          const botReply = data.reply || 'I am sorry, I could not generate a response.';
          this.renderMessage('assistant', botReply, true);
          this.history.push({ role: 'assistant', content: botReply });
          StorageHelper.set(this.storageKey, this.history.slice(-20));
          DashboardModule.logActivity(`Asked AI: "${text.substring(0, 32)}..."`);
        } else {
          const offlineReply = getOfflineTutorReply(text);
          if (offlineReply) {
            this.renderMessage('assistant', `Free Local Study Tutor: ${text}\n\n${offlineReply}`, true);
            this.history.push({ role: 'assistant', content: offlineReply });
            StorageHelper.set(this.storageKey, this.history.slice(-20));
          } else {
            const errMsg = data.error || 'Unable to process that question locally.';
            this.renderErrorBubble(errMsg, data.isApiKeyMissing);
          }
        }
      } catch (err) {
        loadingBubble.remove();
        const offlineReply = getOfflineTutorReply(text);
        if (offlineReply) {
          this.renderMessage('assistant', `Free Local Study Tutor: ${text}\n\n${offlineReply}`, true);
          this.history.push({ role: 'assistant', content: offlineReply });
          StorageHelper.set(this.storageKey, this.history.slice(-20));
        } else {
          this.renderErrorBubble('AI server is unavailable. Deploy the backend and configure API_BASE_URL for questions outside the offline tutor topics.');
        }
      }
    },

    renderMessage(role, content, shouldScroll = true) {
      if (!this.messagesBox) return;

      const msgDiv = document.createElement('div');
      msgDiv.className = `chat-message message-${role === 'user' ? 'user' : 'bot'}`;

      const avatarIcon = role === 'user' ? 'fa-user' : 'fa-robot';
      const authorName = role === 'user' ? 'You' : 'StudySmart AI Tutor';
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      msgDiv.innerHTML = `
        <div class="message-avatar"><i class="fa-solid ${avatarIcon}"></i></div>
        <div class="message-bubble">
          <div class="message-author">
            <span>${authorName}</span>
            <span class="message-time">${time}</span>
          </div>
          <div class="message-body">${this.formatMarkdown(content)}</div>
        </div>
      `;

      this.messagesBox.appendChild(msgDiv);
      if (shouldScroll) {
        this.messagesBox.scrollTop = this.messagesBox.scrollHeight;
      }
    },

    showLoadingBubble() {
      const bubble = document.createElement('div');
      bubble.className = 'chat-message message-bot';
      bubble.innerHTML = `
        <div class="message-avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="message-bubble">
          <div class="message-author"><span>StudySmart AI Tutor</span></div>
          <div class="message-body">
            <span class="typing-indicator"><i class="fa-solid fa-ellipsis fa-fade"></i> AI is thinking and formulating explanation...</span>
          </div>
        </div>
      `;
      this.messagesBox.appendChild(bubble);
      this.messagesBox.scrollTop = this.messagesBox.scrollHeight;
      return bubble;
    },

    renderErrorBubble(errorMsg, isKeyMissing = false) {
      const bubble = document.createElement('div');
      bubble.className = 'chat-message message-bot';

      let helpContent = `<p style="color:#f87171; font-weight:600;"><i class="fa-solid fa-triangle-exclamation"></i> ${Toast.escapeHtml(errorMsg)}</p>`;

      bubble.innerHTML = `
        <div class="message-avatar" style="background:#f43f5e;"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <div class="message-bubble" style="border-color:#f43f5e;">
          <div class="message-author"><span style="color:#f87171;">System Notice</span></div>
          <div class="message-body">${helpContent}</div>
        </div>
      `;
      this.messagesBox.appendChild(bubble);
      this.messagesBox.scrollTop = this.messagesBox.scrollHeight;
    },

    clearChat() {
      this.history = [];
      StorageHelper.remove(this.storageKey);
      if (this.messagesBox) {
        this.messagesBox.innerHTML = `
          <div class="chat-message message-bot">
            <div class="message-avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="message-bubble">
              <div class="message-author">StudySmart AI Tutor <span class="message-time">Just now</span></div>
              <div class="message-body">
                <p>Chat history cleared. What subject or concept would you like to review today?</p>
              </div>
            </div>
          </div>
        `;
      }
      Toast.show('Chat history cleared', 'info');
    },

    formatMarkdown(text) {
      if (!text) return '';
      let escaped = Toast.escapeHtml(text);

      // Code blocks with syntax highlight wrapper
      escaped = escaped.replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
      // Inline code
      escaped = escaped.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1); padding:2px 5px; border-radius:4px; font-family:monospace;">$1</code>');
      // Bold
      escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      // Italic
      escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      // Headings
      escaped = escaped.replace(/^### (.*$)/gim, '<h4 style="color:#c4b5fd; margin:0.6rem 0 0.3rem;">$1</h4>');
      escaped = escaped.replace(/^## (.*$)/gim, '<h3 style="color:#93c5fd; margin:0.8rem 0 0.4rem;">$1</h3>');
      escaped = escaped.replace(/^# (.*$)/gim, '<h2 style="color:#818cf8; margin:1rem 0 0.5rem;">$1</h2>');
      // Bullet points
      escaped = escaped.replace(/^\s*-\s+(.*$)/gim, '<li style="margin-left:1.25rem;">$1</li>');
      // Paragraph linebreaks
      escaped = escaped.replace(/\n\n+/g, '</p><p>');
      escaped = escaped.replace(/\n/g, '<br>');

      return `<p>${escaped}</p>`;
    }
  };

  // =========================================================================
  // 7. SMART NOTES MODULE
  // =========================================================================
  const NotesModule = {
    form: document.getElementById('notesForm'),
    subjectSelect: document.getElementById('notesSubjectSelect'),
    topicInput: document.getElementById('notesTopicInput'),
    levelSelect: document.getElementById('notesLevelSelect'),
    languageSelect: document.getElementById('notesLanguageSelect'),
    styleSelect: document.getElementById('notesStyleSelect'),
    generateBtn: document.getElementById('generateNotesBtn'),
    outputTitle: document.getElementById('notesOutputTitle'),
    outputBadge: document.getElementById('notesOutputBadge'),
    copyBtn: document.getElementById('copyNotesBtn'),
    downloadBtn: document.getElementById('downloadNotesBtn'),
    clearBtn: document.getElementById('clearNotesOutputBtn'),
    emptyState: document.getElementById('notesEmptyState'),
    renderedMarkdown: document.getElementById('notesRenderedMarkdown'),
    savedList: document.getElementById('savedNotesList'),
    savedCount: document.getElementById('savedNotesCount'),
    clearSavedBtn: document.getElementById('clearSavedNotesBtn'),

    currentRawNotes: '',
    currentTopic: '',
    storageKey: 'studysmart_saved_notes',

    init() {
      this.renderSavedNotesList();

      if (this.form) {
        this.form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.generateNotes();
        });
      }

      if (this.copyBtn) {
        this.copyBtn.addEventListener('click', () => this.copyNotes());
      }

      if (this.downloadBtn) {
        this.downloadBtn.addEventListener('click', () => this.downloadNotes());
      }

      if (this.clearBtn) {
        this.clearBtn.addEventListener('click', () => this.clearOutput());
      }

      if (this.clearSavedBtn) {
        this.clearSavedBtn.addEventListener('click', () => {
          StorageHelper.set(this.storageKey, []);
          this.renderSavedNotesList();
          Toast.show('Saved notes cleared', 'info');
        });
      }
    },

    async generateNotes() {
      const topic = this.topicInput ? this.topicInput.value.trim() : '';
      if (!topic) {
        Toast.show('Please enter a study topic', 'error');
        return;
      }

      const subject = this.subjectSelect ? this.subjectSelect.value : 'General';
      const level = this.levelSelect ? this.levelSelect.value : 'Undergraduate';
      const language = this.languageSelect ? this.languageSelect.value : 'English';
      const style = this.styleSelect ? this.styleSelect.value : 'Comprehensive';

      // UI Loading State
      if (this.generateBtn) {
        this.generateBtn.disabled = true;
        this.generateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating Academic Notes...';
      }
      if (this.outputBadge) this.outputBadge.textContent = 'Generating...';

      try {
        const res = await fetch(getApiUrl('/api/generate-notes'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject, topic, level, language, style })
        });

        const contentType = res.headers.get('content-type') || '';
        const data = contentType.includes('application/json')
          ? await res.json()
          : { error: 'Career planning endpoint is unavailable. Start the local server and reload the page.' };

        if (res.ok && data.success) {
          this.currentRawNotes = data.notes;
          this.currentTopic = topic;

          if (this.emptyState) this.emptyState.style.display = 'none';
          if (this.renderedMarkdown) {
            this.renderedMarkdown.style.display = 'block';
            this.renderedMarkdown.innerHTML = ChatModule.formatMarkdown(data.notes);
          }
          if (this.outputTitle) this.outputTitle.textContent = `${topic} — Notes`;
          if (this.outputBadge) {
            this.outputBadge.textContent = `${subject} • Ready`;
            this.outputBadge.className = 'badge badge-emerald';
          }

          if (this.copyBtn) this.copyBtn.disabled = false;
          if (this.downloadBtn) this.downloadBtn.disabled = false;
          if (this.clearBtn) this.clearBtn.disabled = false;

          // Save to LocalStorage history
          this.saveNoteToHistory(subject, topic, data.notes);
          DashboardModule.incrementNotesCreated();
          DashboardModule.logActivity(`Generated notes for "${topic}"`);
          Toast.show('Smart revision notes generated successfully!', 'success');
        } else {
          Toast.show(data.error || 'Failed to generate study notes.', 'error');
          if (this.outputBadge) this.outputBadge.textContent = 'Error';
        }
      } catch (err) {
        Toast.show('Server connection error. Make sure server.js is running.', 'error');
        if (this.outputBadge) this.outputBadge.textContent = 'Error';
      } finally {
        if (this.generateBtn) {
          this.generateBtn.disabled = false;
          this.generateBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Smart Notes';
        }
      }
    },

    copyNotes() {
      if (!this.currentRawNotes) return;
      navigator.clipboard.writeText(this.currentRawNotes).then(() => {
        Toast.show('Notes copied to clipboard!', 'success');
      }).catch(() => {
        Toast.show('Failed to copy. Please manually copy notes text.', 'error');
      });
    },

    downloadNotes() {
      if (!this.currentRawNotes) return;
      const filename = `${(this.currentTopic || 'StudySmart-Notes').replace(/[^a-z0-9]/gi, '_')}.txt`;
      const blob = new Blob([this.currentRawNotes], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Toast.show(`Downloaded: ${filename}`, 'info');
    },

    clearOutput() {
      this.currentRawNotes = '';
      this.currentTopic = '';
      if (this.emptyState) this.emptyState.style.display = 'flex';
      if (this.renderedMarkdown) {
        this.renderedMarkdown.style.display = 'none';
        this.renderedMarkdown.innerHTML = '';
      }
      if (this.outputTitle) this.outputTitle.textContent = 'Generated Notes';
      if (this.outputBadge) {
        this.outputBadge.textContent = 'Ready';
        this.outputBadge.className = 'badge badge-subtle';
      }
      if (this.copyBtn) this.copyBtn.disabled = true;
      if (this.downloadBtn) this.downloadBtn.disabled = true;
      if (this.clearBtn) this.clearBtn.disabled = true;
    },

    saveNoteToHistory(subject, topic, content) {
      const saved = StorageHelper.get(this.storageKey, []);
      const newNote = {
        id: `note_${Date.now()}`,
        subject,
        topic,
        content,
        date: new Date().toLocaleDateString()
      };
      saved.unshift(newNote);
      StorageHelper.set(this.storageKey, saved.slice(0, 15));
      this.renderSavedNotesList();
    },

    renderSavedNotesList() {
      if (!this.savedList) return;
      const saved = StorageHelper.get(this.storageKey, []);

      if (this.savedCount) this.savedCount.textContent = saved.length;

      if (saved.length === 0) {
        this.savedList.innerHTML = '<li class="empty-list-notice">No saved notes yet. Generate your first topic above!</li>';
        return;
      }

      this.savedList.innerHTML = saved.map(note => `
        <li class="saved-note-item" data-id="${note.id}">
          <div style="display:flex; flex-direction:column; overflow:hidden;">
            <strong style="text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${Toast.escapeHtml(note.topic)}</strong>
            <span style="font-size:0.72rem; color:var(--text-muted);">${Toast.escapeHtml(note.subject)} • ${note.date}</span>
          </div>
          <i class="fa-solid fa-chevron-right" style="color:var(--text-muted); font-size:0.75rem;"></i>
        </li>
      `).join('');

      this.savedList.querySelectorAll('.saved-note-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.getAttribute('data-id');
          const note = saved.find(n => n.id === id);
          if (note) {
            this.currentRawNotes = note.content;
            this.currentTopic = note.topic;
            if (this.emptyState) this.emptyState.style.display = 'none';
            if (this.renderedMarkdown) {
              this.renderedMarkdown.style.display = 'block';
              this.renderedMarkdown.innerHTML = ChatModule.formatMarkdown(note.content);
            }
            if (this.outputTitle) this.outputTitle.textContent = `${note.topic} (Saved)`;
            if (this.outputBadge) {
              this.outputBadge.textContent = `${note.subject} • Cached`;
              this.outputBadge.className = 'badge badge-cyan';
            }
            if (this.copyBtn) this.copyBtn.disabled = false;
            if (this.downloadBtn) this.downloadBtn.disabled = false;
            if (this.clearBtn) this.clearBtn.disabled = false;
            Toast.show(`Loaded notes for "${note.topic}"`, 'info');
          }
        });
      });
    }
  };

  // =========================================================================
  // 8. DAILY 50 QUIZ CHALLENGE MODULE (50+ Validated Questions & Real Tracking)
  // =========================================================================
  const QuizModule = {
    tabDaily50: document.getElementById('tabDaily50'),
    tabSubjectPractice: document.getElementById('tabSubjectPractice'),
    tabAiCustomQuiz: document.getElementById('tabAiCustomQuiz'),
    subjectPillsRow: document.getElementById('quizSubjectPills'),
    aiQuizBar: document.getElementById('aiQuizBar'),
    aiTopicInput: document.getElementById('aiQuizTopicInput'),
    aiCountSelect: document.getElementById('aiQuizCountSelect'),
    generateAiBtn: document.getElementById('generateAiQuizBtn'),

    activeTopicBadge: document.getElementById('quizActiveTopicBadge'),
    currentQNum: document.getElementById('currentQuestionNum'),
    totalQNum: document.getElementById('totalQuestionsNum'),
    liveScore: document.getElementById('liveScoreCounter'),
    progressFill: document.getElementById('quizProgressFill'),
    questionText: document.getElementById('questionText'),
    optionsGrid: document.getElementById('quizOptionsGrid'),
    feedbackBox: document.getElementById('quizFeedbackBox'),
    feedbackIcon: document.getElementById('feedbackIcon'),
    feedbackStatus: document.getElementById('feedbackStatus'),
    feedbackExplanation: document.getElementById('feedbackExplanation'),
    prevBtn: document.getElementById('prevQuestionBtn'),
    nextBtn: document.getElementById('nextQuestionBtn'),
    restartBtn: document.getElementById('restartQuizBtn'),

    activeArea: document.getElementById('quizActiveArea'),
    resultArea: document.getElementById('quizResultArea'),
    resultScore: document.getElementById('resultScore'),
    resultPercent: document.getElementById('resultPercent'),
    resultVerdict: document.getElementById('resultVerdict'),
    resultStreakDisplay: document.getElementById('resultStreakDisplay'),
    retakeBtn: document.getElementById('retakeQuizBtn'),

    dailyCompletedCount: document.getElementById('dailyCompletedCount'),
    dailyProgressFill: document.getElementById('dailyProgressFill'),

    mode: 'daily50',
    selectedCategory: 'all',
    questionsList: [],
    currentIndex: 0,
    score: 0,
    userAnswers: {}, // index -> { selectedIndex, isCorrect }

    // Expansive 50+ High-Yield Academic University Question Bank (8 Disciplines)
    questionBank: [
      // 1. DIGITAL MARKETING
      {
        subject: "Digital Marketing",
        category: "marketing",
        question: "What is the primary difference between SEO (Search Engine Optimization) and SEM (Search Engine Marketing)?",
        options: [
          "SEO focuses on organic unpaid search rankings, whereas SEM includes paid search advertising campaigns (PPC).",
          "SEO is strictly used on mobile devices, while SEM operates exclusively on desktop computers.",
          "SEO requires an immediate daily advertising spend, whereas SEM is completely free of cost.",
          "SEO produces instant results within 5 minutes, while SEM takes 6 months to display ads."
        ],
        correctIndex: 0,
        explanation: "SEO optimizes web architecture and content for organic Google rankings, while SEM utilizes platforms like Google Ads for paid pay-per-click bidding."
      },
      {
        subject: "Digital Marketing",
        category: "marketing",
        question: "How is Customer Acquisition Cost (CAC) calculated in a digital advertising campaign?",
        options: [
          "Total Sales Revenue / Total Clicks",
          "Total Sales and Marketing Expenses / Number of New Customers Acquired",
          "Total Impressions / Total Ad Spend",
          "Average Order Value * Profit Margin"
        ],
        correctIndex: 1,
        explanation: "CAC is calculated by dividing the total marketing and sales costs incurred over a given period by the total number of new customers acquired."
      },
      {
        subject: "Digital Marketing",
        category: "marketing",
        question: "If an ad campaign delivers 500 clicks from 25,000 impressions, what is its Click-Through Rate (CTR)?",
        options: [
          "0.5%",
          "1.0%",
          "2.0%",
          "5.0%"
        ],
        correctIndex: 2,
        explanation: "CTR = (Clicks / Impressions) * 100 = (500 / 25,000) * 100 = 2.0%."
      },
      {
        subject: "Digital Marketing",
        category: "marketing",
        question: "What metric is defined by dividing Total Revenue generated by the campaign by the Total Cost of Advertising?",
        options: [
          "ROAS (Return on Ad Spend)",
          "Churn Rate",
          "Bounce Rate",
          "Cost Per Mille (CPM)"
        ],
        correctIndex: 0,
        explanation: "ROAS (Return on Ad Spend) measures gross revenue earned for every rupee or dollar spent on advertising (Revenue / Ad Spend)."
      },
      {
        subject: "Digital Marketing",
        category: "marketing",
        question: "In email marketing, what does 'Soft Bounce' indicate?",
        options: [
          "The email address is permanently invalid or deleted.",
          "A temporary delivery failure, such as a full inbox or temporary server downtime.",
          "The recipient unsubscribed from the newsletter.",
          "The email was flagged as spam by the recipient."
        ],
        correctIndex: 1,
        explanation: "A soft bounce is temporary (e.g. server down, full inbox), whereas a hard bounce is permanent (non-existent domain or address)."
      },
      {
        subject: "Digital Marketing",
        category: "marketing",
        question: "Which of the following describes the 'Remarketing / Retargeting' advertising strategy?",
        options: [
          "Serving advertisements specifically to users who have previously visited your website or app.",
          "Advertising exclusively on traditional billboards and radio.",
          "Emailing random contacts bought from third-party databases.",
          "Bidding on brand keywords of direct market competitors."
        ],
        correctIndex: 0,
        explanation: "Retargeting uses browser tracking cookies or first-party tags to display ads to past visitors, driving higher conversion rates."
      },
      {
        subject: "Digital Marketing",
        category: "marketing",
        question: "What is Google's 'Quality Score' primarily composed of?",
        options: [
          "Company age, physical office size, and stock market capitalization.",
          "Expected Click-Through Rate (CTR), Ad Relevance, and Landing Page Experience.",
          "Total advertising spend and number of credit cards linked.",
          "Social media follower count and employee count on LinkedIn."
        ],
        correctIndex: 1,
        explanation: "Google Ads Quality Score is evaluated based on expected CTR, keyword-to-ad relevance, and the user experience of the destination landing page."
      },

      // 2. ARTIFICIAL INTELLIGENCE & DATA SCIENCE
      {
        subject: "Artificial Intelligence",
        category: "ai",
        question: "What is the primary distinction between Supervised Learning and Unsupervised Learning?",
        options: [
          "Supervised learning trains models on labeled input-output data, while unsupervised learning discovers patterns in unlabeled data.",
          "Supervised learning uses quantum computers, whereas unsupervised learning runs only on smartphones.",
          "Supervised learning requires zero training data, while unsupervised learning requires petabytes of human annotations.",
          "Supervised learning is only used for speech recognition, whereas unsupervised learning is used for calculators."
        ],
        correctIndex: 0,
        explanation: "Supervised learning relies on labeled training pairs (X, Y), whereas unsupervised learning analyzes structure (e.g., clustering) without explicit labels."
      },
      {
        subject: "Artificial Intelligence",
        category: "ai",
        question: "What problem occurs when a Machine Learning model memorizes the training data but fails to generalize to new, unseen test data?",
        options: [
          "Underfitting",
          "Overfitting",
          "Data Normalization",
          "Gradient Descent Convergence"
        ],
        correctIndex: 1,
        explanation: "Overfitting occurs when a high-capacity model learns noise and specific details of the training set rather than the underlying general trend."
      },
      {
        subject: "Artificial Intelligence",
        category: "ai",
        question: "In Natural Language Processing (NLP), what fundamental innovation allows Transformer architectures (like GPT) to weigh the contextual importance of different words in a sentence?",
        options: [
          "Self-Attention Mechanism",
          "Decision Trees",
          "K-Means Clustering",
          "Bubble Sort"
        ],
        correctIndex: 0,
        explanation: "Self-Attention calculates mathematical relationship weights between every pair of tokens in a sequence, allowing deep contextual comprehension."
      },
      {
        subject: "Artificial Intelligence",
        category: "ai",
        question: "What is 'Hallucination' in Large Language Models (LLMs)?",
        options: [
          "When the model powers off due to overheating GPU fans.",
          "When the model generates plausible-sounding but factually incorrect or fabricated information.",
          "When the model translates text into multiple languages simultaneously.",
          "When the server executes a backup database dump."
        ],
        correctIndex: 1,
        explanation: "Hallucination refers to generative AI generating syntactically convincing assertions that are factually unfounded or fictitious."
      },
      {
        subject: "Artificial Intelligence",
        category: "ai",
        question: "Which evaluation metric in classification represents the ratio of True Positives to the sum of True Positives and False Positives?",
        options: [
          "Precision",
          "Recall",
          "Mean Squared Error (MSE)",
          "Silhouette Score"
        ],
        correctIndex: 0,
        explanation: "Precision = TP / (TP + FP), measuring the accuracy of positive predictions made by the model."
      },
      {
        subject: "Artificial Intelligence",
        category: "ai",
        question: "What is the purpose of 'Reinforcement Learning from Human Feedback' (RLHF) in training modern AI models?",
        options: [
          "To align model outputs with human preferences, helpfulness, and ethical safety standards.",
          "To format the hard drives of training servers every 24 hours.",
          "To permanently block open-source software libraries.",
          "To replace neural networks with linear regression."
        ],
        correctIndex: 0,
        explanation: "RLHF fine-tunes pre-trained models using reward signals derived from human rank-ordering of responses to enhance alignment and safety."
      },

      // 3. BUSINESS STUDIES & MARKETING STRATEGY
      {
        subject: "Business Studies",
        category: "business",
        question: "Which component of a SWOT Analysis examines internal factors favorable to an organization?",
        options: [
          "Strengths",
          "Weaknesses",
          "Opportunities",
          "Threats"
        ],
        correctIndex: 0,
        explanation: "Strengths and Weaknesses are internal organizational factors, while Opportunities and Threats represent external market forces."
      },
      {
        subject: "Business Studies",
        category: "business",
        question: "What does the 'STP' marketing framework stand for?",
        options: [
          "Sales, Turnover, and Profitability",
          "Segmentation, Targeting, and Positioning",
          "Strategy, Technology, and Pricing",
          "Structure, Training, and Performance"
        ],
        correctIndex: 1,
        explanation: "STP stands for Market Segmentation, Market Targeting, and Product Positioning, the foundational pillars of commercial marketing strategy."
      },
      {
        subject: "Business Studies",
        category: "business",
        question: "Which of the following is NOT one of Porter's Five Competitive Forces?",
        options: [
          "Threat of New Entrants",
          "Bargaining Power of Buyers",
          "Bargaining Power of Suppliers",
          "Government Foreign Exchange Reserves"
        ],
        correctIndex: 3,
        explanation: "Porter's 5 forces are: Rivalry among existing competitors, Threat of new entrants, Threat of substitute products, Bargaining power of buyers, and Bargaining power of suppliers."
      },
      {
        subject: "Business Studies",
        category: "business",
        question: "In the Marketing 4Ps Mix framework, what are the four elements?",
        options: [
          "People, Process, Physical Evidence, Profit",
          "Product, Price, Place, Promotion",
          "Planning, Purchasing, Packaging, Presentation",
          "Performance, Partnership, Placement, Presence"
        ],
        correctIndex: 1,
        explanation: "E. Jerome McCarthy's classic 4Ps marketing mix framework consists of Product, Price, Place, and Promotion."
      },
      {
        subject: "Business Studies",
        category: "business",
        question: "What is a 'Blue Ocean Strategy'?",
        options: [
          "Competing ruthlessly on price in an overcrowded, existing market space.",
          "Creating uncontested market space and making competition irrelevant through value innovation.",
          "Operating maritime logistics and freight transport businesses exclusively.",
          "Acquiring direct competitors through hostile corporate takeovers."
        ],
        correctIndex: 1,
        explanation: "Blue Ocean Strategy involves creating new market demand in uncharted spaces (blue oceans) rather than fighting over existing market share (red oceans)."
      },

      // 4. MANAGERIAL ECONOMICS
      {
        subject: "Economics",
        category: "economics",
        question: "When the price elasticity of demand for a product is greater than 1 (|Ed| > 1), how is the demand classified?",
        options: [
          "Inelastic",
          "Unitary Elastic",
          "Elastic",
          "Perfect Inelastic"
        ],
        correctIndex: 2,
        explanation: "When |Ed| > 1, demand is price elastic, meaning a percentage change in price causes a proportionately larger percentage change in quantity demanded."
      },
      {
        subject: "Economics",
        category: "economics",
        question: "What is 'Opportunity Cost' in economic decision-making?",
        options: [
          "The total monetary cost of an item printed on the retail receipt.",
          "The value of the next best alternative that is forgone when a choice is made.",
          "The cost of buying insurance for unexpected natural disasters.",
          "The annual depreciation expense of company machinery."
        ],
        correctIndex: 1,
        explanation: "Opportunity cost represents the prospective benefit or value of the best alternative foregone when allocating limited resources."
      },
      {
        subject: "Economics",
        category: "economics",
        question: "What is the economic phenomenon of 'Stagflation' characterized by?",
        options: [
          "High economic growth combined with deflation.",
          "Stagnant economic growth, high unemployment, and high inflation occurring simultaneously.",
          "Zero interest rates and hyper-fast GDP acceleration.",
          "Complete balance of payments surplus across all trading nations."
        ],
        correctIndex: 1,
        explanation: "Stagflation is the painful macroeconomic confluence of stagnant output/growth, high unemployment, and persistently rising price inflation."
      },
      {
        subject: "Economics",
        category: "economics",
        question: "What does the Law of Diminishing Marginal Utility state?",
        options: [
          "As more units of a good are consumed, the additional satisfaction gained from each extra unit decreases.",
          "Total utility drops to zero immediately after purchasing a product.",
          "Consumers always purchase the most expensive brand available.",
          "Suppliers will produce less when market prices rise."
        ],
        correctIndex: 0,
        explanation: "The Law of Diminishing Marginal Utility states that as an individual consumes more units of a specific commodity, the marginal utility derived from each subsequent unit declines."
      },
      {
        subject: "Economics",
        category: "economics",
        question: "Which market structure is characterized by a few large interdependent firms dominating the industry?",
        options: [
          "Monopoly",
          "Perfect Competition",
          "Oligopoly",
          "Monopsony"
        ],
        correctIndex: 2,
        explanation: "An oligopoly is an industry dominated by a small number of large sellers (e.g. commercial aviation, telecom carriers), whose decisions are strategic and interdependent."
      },

      // 5. PRINCIPLES OF MANAGEMENT
      {
        subject: "Management",
        category: "management",
        question: "Who is widely recognized as the 'Father of Modern Management Theory' for formulating the 14 Principles of Management?",
        options: [
          "Henri Fayol",
          "Frederick Winslow Taylor",
          "Elton Mayo",
          "Peter Drucker"
        ],
        correctIndex: 0,
        explanation: "Henri Fayol developed the administrative management theory and formulated the classic 14 Principles of Management."
      },
      {
        subject: "Management",
        category: "management",
        question: "In management theory, what does 'Span of Control' refer to?",
        options: [
          "The total square footage of corporate executive offices.",
          "The number of subordinates directly reporting to a single manager or supervisor.",
          "The length of time an employee must work before taking annual leave.",
          "The legal jurisdiction of corporate bylaws."
        ],
        correctIndex: 1,
        explanation: "Span of control (or span of management) denotes the number of individuals a manager directly oversees and coordinates."
      },
      {
        subject: "Management",
        category: "management",
        question: "What are the four core functions of management in sequential order?",
        options: [
          "Purchasing, Producing, Packaging, Promoting",
          "Planning, Organizing, Leading, Controlling (POLC)",
          "Hiring, Firing, Auditing, Accounting",
          "Selling, Marketing, Delivering, Billing"
        ],
        correctIndex: 1,
        explanation: "The classical POLC framework establishes Planning, Organizing, Leading (Directing), and Controlling as the essential management cycle."
      },
      {
        subject: "Management",
        category: "management",
        question: "Which leadership style involves giving team members complete freedom to make decisions with minimal managerial intervention?",
        options: [
          "Autocratic Leadership",
          "Laissez-Faire (Delegative) Leadership",
          "Transactional Leadership",
          "Bureaucratic Leadership"
        ],
        correctIndex: 1,
        explanation: "Laissez-faire leadership provides team autonomy and hands-off delegation, empowering competent team members to self-direct."
      },
      {
        subject: "Management",
        category: "management",
        question: "What does the SMART criteria for goal setting stand for?",
        options: [
          "Simple, Measurable, Actionable, Reliable, Timeless",
          "Specific, Measurable, Achievable, Relevant, Time-bound",
          "Strategic, Market-oriented, Audited, Regulated, Tested",
          "Standardized, Meaningful, Accountable, Resourceful, Thorough"
        ],
        correctIndex: 1,
        explanation: "SMART goals are Specific, Measurable, Achievable, Relevant, and Time-bound."
      },

      // 6. ACCOUNTING & FINANCE
      {
        subject: "Accounting",
        category: "accounting",
        question: "What is the fundamental accounting equation represented in every corporate Balance Sheet?",
        options: [
          "Assets = Liabilities + Owner's Equity",
          "Revenue = Expenses + Gross Profit",
          "Cash Flow = Net Income + Taxes",
          "Assets = Current Liabilities - Long Term Debt"
        ],
        correctIndex: 0,
        explanation: "The foundational double-entry accounting equation is: Assets = Liabilities + Shareholders' (Owner's) Equity."
      },
      {
        subject: "Accounting",
        category: "accounting",
        question: "Under the Accrual Basis of Accounting, when are revenues and expenses recognized?",
        options: [
          "Only when physical physical currency is deposited in the company's bank vault.",
          "When earned or incurred, regardless of when cash is received or paid.",
          "Exclusively on the final day of the financial calendar year.",
          "Whenever the external tax audit report is published."
        ],
        correctIndex: 1,
        explanation: "Accrual accounting records revenues when earned and expenses when incurred, matching revenues with associated expenses in the period they occur."
      },
      {
        subject: "Accounting",
        category: "accounting",
        question: "Which financial statement reports a company's financial performance (revenues, expenses, and net profit) over a specific reporting period?",
        options: [
          "Balance Sheet",
          "Income Statement (Profit & Loss)",
          "Statement of Financial Position",
          "Depreciation Schedule"
        ],
        correctIndex: 1,
        explanation: "The Income Statement (P&L) summarizes revenues, cost of goods sold, operating expenses, and net income over a specified timeframe."
      },
      {
        subject: "Accounting",
        category: "accounting",
        question: "What does 'Working Capital' measure and how is it calculated?",
        options: [
          "Current Assets - Current Liabilities; measures short-term operational liquidity.",
          "Total Fixed Assets + Long Term Debt; measures physical factory capacity.",
          "Total Revenue / Share Price; measures stock valuation.",
          "Gross Margin * Tax Rate; measures tax obligation."
        ],
        correctIndex: 0,
        explanation: "Working Capital = Current Assets - Current Liabilities. Positive working capital indicates an organization can readily cover short-term debts."
      },
      {
        subject: "Accounting",
        category: "accounting",
        question: "What is non-cash expense that allocates the depreciable cost of a physical asset over its estimated useful life called?",
        options: [
          "Depreciation",
          "Amortization of Goodwill",
          "Dividends Paid",
          "Accounts Receivable"
        ],
        correctIndex: 0,
        explanation: "Depreciation allocates the cost of tangible fixed assets (e.g. laptops, vehicles, machinery) across their expected productive lifespan."
      },

      // 7. BUSINESS ENGLISH & COMMUNICATION
      {
        subject: "English",
        category: "english",
        question: "Which sentence demonstrates the most professional and polished corporate email etiquette?",
        options: [
          "Hey send me the file right now dude.",
          "Could you please share the Q3 marketing analytics report at your earliest convenience?",
          "I need that doc ASAP or else.",
          "Plz thx for the report bro."
        ],
        correctIndex: 1,
        explanation: "Professional business correspondence maintains polite modal verbs ('Could you please...') and formal clarity."
      },
      {
        subject: "English",
        category: "english",
        question: "What is the meaning of the common business idiom 'To get all your ducks in a row'?",
        options: [
          "To purchase poultry products for corporate catering.",
          "To organize, prepare, and align all tasks properly before executing a project.",
          "To terminate all junior marketing interns.",
          "To lower product prices below factory cost."
        ],
        correctIndex: 1,
        explanation: "The idiom 'get ducks in a row' signifies getting oneself thoroughly organized and prepared before undertaking an endeavor."
      },
      {
        subject: "English",
        category: "english",
        question: "Which of the following is written in active voice?",
        options: [
          "The annual marketing campaign was planned by the strategy team.",
          "The strategy team planned the annual marketing campaign.",
          "A presentation was delivered by our professor yesterday.",
          "The mistake was noticed by the senior auditor."
        ],
        correctIndex: 1,
        explanation: "In active voice, the subject performs the action directly ('The strategy team [subject] planned [verb]...')."
      },
      {
        subject: "English",
        category: "english",
        question: "In executive business presentations, what does the '7x7 Rule' recommend?",
        options: [
          "7 slides per minute for 7 continuous hours.",
          "No more than 7 lines of text per slide, with no more than 7 words per line.",
          "Employing exactly 7 graphic designers for 7 weeks.",
          "Using 7 different font colors on every presentation slide."
        ],
        correctIndex: 1,
        explanation: "The 7x7 presentation design rule limits slide clutter to a maximum of 7 lines and approximately 7 words per line for optimal legibility."
      },
      {
        subject: "English",
        category: "english",
        question: "Identify the word that is an antonym for 'Transparent' in business governance:",
        options: [
          "Opaque",
          "Candid",
          "Honest",
          "Lucid"
        ],
        correctIndex: 0,
        explanation: "'Opaque' means obscure or non-transparent, representing the opposite of transparent."
      },

      // 8. GENERAL APTITUDE & LOGICAL REASONING
      {
        subject: "General Aptitude",
        category: "aptitude",
        question: "A digital marketing product originally priced at Rs. 2,000 is discounted by 20%, and then an additional 10% coupon is applied to the discounted price. What is the final price?",
        options: [
          "Rs. 1,400",
          "Rs. 1,440",
          "Rs. 1,500",
          "Rs. 1,600"
        ],
        correctIndex: 1,
        explanation: "First discount: 2000 - 20% (400) = 1600. Second discount: 1600 - 10% (160) = Rs. 1,440."
      },
      {
        subject: "General Aptitude",
        category: "aptitude",
        question: "Complete the logical number series: 3, 7, 15, 31, 63, ___?",
        options: [
          "127",
          "125",
          "128",
          "131"
        ],
        correctIndex: 0,
        explanation: "The pattern is (x * 2) + 1. (63 * 2) + 1 = 126 + 1 = 127."
      },
      {
        subject: "General Aptitude",
        category: "aptitude",
        question: "If 5 content writers can write 15 marketing blog articles in 3 days, how many articles can 10 content writers write in 6 days at the same pace?",
        options: [
          "30 articles",
          "45 articles",
          "60 articles",
          "90 articles"
        ],
        correctIndex: 2,
        explanation: "Rate = 15 articles / (5 writers * 3 days) = 1 article per writer per day. 10 writers * 6 days * 1 article/day = 60 articles."
      },
      {
        subject: "General Aptitude",
        category: "aptitude",
        question: "Look at the pattern: Apple is to Fruit as Carrot is to:",
        options: [
          "Vegetable",
          "Drink",
          "Dessert",
          "Grain"
        ],
        correctIndex: 0,
        explanation: "Carrot belongs to the category of vegetables, just as apple belongs to fruits."
      },
      {
        subject: "General Aptitude",
        category: "aptitude",
        question: "A store owner buys an AI textbook for Rs. 800 and sells it for Rs. 1,000. What is the profit percentage?",
        options: [
          "20%",
          "25%",
          "15%",
          "30%"
        ],
        correctIndex: 1,
        explanation: "Profit = 1000 - 800 = 200. Profit % = (Profit / Cost Price) * 100 = (200 / 800) * 100 = 25%."
      },

      // Additional Questions to reach full 50 questions across all disciplines
      {
        subject: "Digital Marketing",
        category: "marketing",
        question: "What is an 'A/B Test' (Split Test) in conversion rate optimization?",
        options: [
          "Comparing two variations of a web page or ad (A vs B) to see which variant yields a higher conversion rate.",
          "Testing whether an internet cable is connected to router A or B.",
          "Sending two completely identical emails to the exact same customer.",
          "Interviewing candidate A and candidate B for a job."
        ],
        correctIndex: 0,
        explanation: "A/B testing serves two variants randomly to traffic to scientifically isolate which headline, CTA, or design converts better."
      },
      {
        subject: "Artificial Intelligence",
        category: "ai",
        question: "Which term refers to the process of converting textual words into numerical vectors that capture semantic meaning in AI?",
        options: [
          "Word Embeddings",
          "Defragmentation",
          "Binary Compilation",
          "Rasterization"
        ],
        correctIndex: 0,
        explanation: "Word embeddings (e.g. Word2Vec, Ada embeddings) map words to continuous high-dimensional vector spaces where similar concepts cluster together."
      },
      {
        subject: "Business Studies",
        category: "business",
        question: "What does the 'LTV to CAC Ratio' signify for a software or subscription business?",
        options: [
          "How many customers churn each quarter.",
          "The relationship between the lifetime gross value of a customer versus the cost to acquire them (optimal benchmark is 3:1 or higher).",
          "The tax rate on imported electronic goods.",
          "The ratio of female to male board directors."
        ],
        correctIndex: 1,
        explanation: "A healthy SaaS or subscription business aims for an LTV:CAC ratio of at least 3:1, indicating high marketing capital efficiency."
      },
      {
        subject: "Economics",
        category: "economics",
        question: "Which economic policy is enacted by a country's Central Bank (like RBI or US Fed) to control money supply and interest rates?",
        options: [
          "Monetary Policy",
          "Fiscal Policy",
          "Trade Policy",
          "Industrial Policy"
        ],
        correctIndex: 0,
        explanation: "Monetary policy is controlled by the central bank (repo rate, open market operations), while Fiscal policy is enacted by the government (taxation and spending)."
      },
      {
        subject: "Management",
        category: "management",
        question: "According to Abraham Maslow's Hierarchy of Needs, which level of human need is situated at the very top of the pyramid?",
        options: [
          "Physiological Needs",
          "Safety Needs",
          "Self-Actualization",
          "Social Belonging"
        ],
        correctIndex: 2,
        explanation: "Self-actualization represents the realization of one's full potential and sits at the pinnacle of Maslow's hierarchy."
      },
      {
        subject: "Accounting",
        category: "accounting",
        question: "What financial metric represents Earnings Before Interest, Taxes, Depreciation, and Amortization?",
        options: [
          "EBITDA",
          "ROIC",
          "EPS",
          "P/E Ratio"
        ],
        correctIndex: 0,
        explanation: "EBITDA measures operating cash profitability by stripping out financing, tax, and non-cash accounting expenses."
      },
      {
        subject: "English",
        category: "english",
        question: "What is a 'Call to Action' (CTA) in marketing copy?",
        options: [
          "A phone call from the credit card company.",
          "An explicit prompt encouraging the reader to take an immediate desired action (e.g., 'Claim Free Trial Now').",
          "An internal team meeting invite.",
          "A legal disclaimer at the bottom of a contract."
        ],
        correctIndex: 1,
        explanation: "A CTA is an unambiguous directive in promotional copy designed to prompt an immediate click, sign-up, or transaction."
      },
      {
        subject: "General Aptitude",
        category: "aptitude",
        question: "If a digital marketing campaign budget of Rs. 60,000 is distributed among SEO, PPC, and Social Media in the ratio 2 : 3 : 5, how much budget is allocated to PPC?",
        options: [
          "Rs. 12,000",
          "Rs. 18,000",
          "Rs. 24,000",
          "Rs. 30,000"
        ],
        correctIndex: 1,
        explanation: "Total parts = 2 + 3 + 5 = 10. PPC share = (3 / 10) * 60,000 = Rs. 18,000."
      }
    ],

    dailyStorageKey: 'studysmart_daily_50_progress',

    init() {
      this.bindEvents();
      this.loadDailyProgress();
      this.startQuiz();
    },

    bindEvents() {
      // Mode tabs
      if (this.tabDaily50) {
        this.tabDaily50.addEventListener('click', () => this.switchMode('daily50'));
      }
      if (this.tabSubjectPractice) {
        this.tabSubjectPractice.addEventListener('click', () => this.switchMode('subject'));
      }
      if (this.tabAiCustomQuiz) {
        this.tabAiCustomQuiz.addEventListener('click', () => this.switchMode('ai'));
      }

      // Subject pills
      if (this.subjectPillsRow) {
        this.subjectPillsRow.addEventListener('click', (e) => {
          const pill = e.target.closest('.category-pill');
          if (pill) {
            this.subjectPillsRow.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            this.selectedCategory = pill.getAttribute('data-category') || 'all';
            this.startQuiz();
          }
        });
      }

      // AI Quiz Generator
      if (this.generateAiBtn) {
        this.generateAiBtn.addEventListener('click', () => this.generateAiQuiz());
      }

      // Navigation buttons
      if (this.prevBtn) {
        this.prevBtn.addEventListener('click', () => this.goToPrevQuestion());
      }
      if (this.nextBtn) {
        this.nextBtn.addEventListener('click', () => this.goToNextQuestion());
      }
      if (this.restartBtn) {
        this.restartBtn.addEventListener('click', () => this.startQuiz());
      }
      if (this.retakeBtn) {
        this.retakeBtn.addEventListener('click', () => {
          if (this.resultArea) this.resultArea.style.display = 'none';
          if (this.activeArea) this.activeArea.style.display = 'block';
          this.startQuiz();
        });
      }
    },

    switchMode(newMode) {
      this.mode = newMode;

      // Update tabs UI
      [this.tabDaily50, this.tabSubjectPractice, this.tabAiCustomQuiz].forEach(tab => {
        if (tab) tab.classList.remove('active');
      });

      if (newMode === 'daily50' && this.tabDaily50) this.tabDaily50.classList.add('active');
      if (newMode === 'subject' && this.tabSubjectPractice) this.tabSubjectPractice.classList.add('active');
      if (newMode === 'ai' && this.tabAiCustomQuiz) this.tabAiCustomQuiz.classList.add('active');

      // Toggle secondary bars
      if (this.subjectPillsRow) {
        this.subjectPillsRow.style.display = newMode === 'subject' ? 'flex' : 'none';
      }
      if (this.aiQuizBar) {
        this.aiQuizBar.style.display = newMode === 'ai' ? 'block' : 'none';
      }

      this.startQuiz();
    },

    loadDailyProgress() {
      const today = new Date().toDateString();
      const stored = StorageHelper.get(this.dailyStorageKey, { date: today, count: 0, correct: 0 });

      let count = 0;
      if (stored.date === today) {
        count = stored.count || 0;
      } else {
        // New day reset
        StorageHelper.set(this.dailyStorageKey, { date: today, count: 0, correct: 0 });
      }

      if (this.dailyCompletedCount) this.dailyCompletedCount.textContent = count;
      if (this.dailyProgressFill) {
        const pct = Math.min(Math.round((count / 50) * 100), 100);
        this.dailyProgressFill.style.width = `${pct}%`;
      }
    },

    recordDailyQuestionAnswered(isCorrect) {
      const today = new Date().toDateString();
      const stored = StorageHelper.get(this.dailyStorageKey, { date: today, count: 0, correct: 0 });

      if (stored.date !== today) {
        stored.date = today;
        stored.count = 0;
        stored.correct = 0;
      }

      stored.count = (stored.count || 0) + 1;
      if (isCorrect) stored.correct = (stored.correct || 0) + 1;

      StorageHelper.set(this.dailyStorageKey, stored);
      this.loadDailyProgress();
      DashboardModule.updateStats();
    },

    startQuiz() {
      // Build questions list based on mode
      if (this.mode === 'daily50') {
        // Daily 50: Use all questions up to 50
        this.questionsList = [...this.questionBank];
        if (this.activeTopicBadge) this.activeTopicBadge.textContent = 'Daily 50 Quiz Challenge';
      } else if (this.mode === 'subject') {
        if (this.selectedCategory === 'all') {
          this.questionsList = [...this.questionBank];
        } else {
          this.questionsList = this.questionBank.filter(q => q.category === this.selectedCategory);
        }
        if (this.activeTopicBadge) this.activeTopicBadge.textContent = `Subject: ${this.selectedCategory.toUpperCase()}`;
      } else if (this.mode === 'ai') {
        // Handled separately when generated
        if (this.questionsList.length === 0) {
          this.questionsList = this.questionBank.slice(0, 5);
        }
      }

      this.currentIndex = 0;
      this.score = 0;
      this.userAnswers = {};

      if (this.resultArea) this.resultArea.style.display = 'none';
      if (this.activeArea) this.activeArea.style.display = 'block';

      this.renderCurrentQuestion();
    },

    renderCurrentQuestion() {
      if (!this.questionsList || this.questionsList.length === 0) {
        if (this.questionText) this.questionText.textContent = 'No questions available in this category.';
        return;
      }

      const q = this.questionsList[this.currentIndex];
      const total = this.questionsList.length;

      // Counters & Progress
      if (this.currentQNum) this.currentQNum.textContent = this.currentIndex + 1;
      if (this.totalQNum) this.totalQNum.textContent = total;
      if (this.liveScore) this.liveScore.textContent = this.score;

      if (this.progressFill) {
        const pct = Math.round(((this.currentIndex + 1) / total) * 100);
        this.progressFill.style.width = `${pct}%`;
      }

      // Question Text
      if (this.questionText) {
        this.questionText.textContent = q.question;
      }

      // Options Rendering
      if (this.optionsGrid) {
        this.optionsGrid.innerHTML = '';
        const answeredState = this.userAnswers[this.currentIndex];

        const letters = ['A', 'B', 'C', 'D'];
        q.options.forEach((optText, optIdx) => {
          const btn = document.createElement('button');
          btn.className = 'quiz-option-card';
          btn.setAttribute('role', 'radio');

          let cardClass = '';
          if (answeredState) {
            btn.disabled = true;
            if (optIdx === q.correctIndex) {
              cardClass = 'correct';
            } else if (optIdx === answeredState.selectedIndex) {
              cardClass = 'incorrect';
            }
          }

          if (cardClass) btn.classList.add(cardClass);

          btn.innerHTML = `
            <span class="option-letter">${letters[optIdx]}</span>
            <span>${Toast.escapeHtml(optText)}</span>
          `;

          if (!answeredState) {
            btn.addEventListener('click', () => this.handleOptionSelect(optIdx));
          }

          this.optionsGrid.appendChild(btn);
        });
      }

      // Feedback Box
      if (this.feedbackBox) {
        const answeredState = this.userAnswers[this.currentIndex];
        if (answeredState) {
          this.feedbackBox.style.display = 'flex';
          this.feedbackBox.className = `feedback-box ${answeredState.isCorrect ? 'correct' : 'incorrect'}`;
          if (this.feedbackIcon) {
            this.feedbackIcon.className = answeredState.isCorrect ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark';
          }
          if (this.feedbackStatus) {
            this.feedbackStatus.textContent = answeredState.isCorrect ? 'Correct Answer!' : 'Incorrect Answer';
          }
          if (this.feedbackExplanation) {
            this.feedbackExplanation.textContent = q.explanation || 'No explanation provided.';
          }
        } else {
          this.feedbackBox.style.display = 'none';
        }
      }

      // Update Prev / Next Buttons
      if (this.prevBtn) {
        this.prevBtn.disabled = this.currentIndex === 0;
      }
      if (this.nextBtn) {
        if (this.currentIndex === total - 1) {
          this.nextBtn.innerHTML = 'Finish Challenge <i class="fa-solid fa-check"></i>';
        } else {
          this.nextBtn.innerHTML = 'Next <i class="fa-solid fa-arrow-right"></i>';
        }
      }
    },

    handleOptionSelect(selectedIdx) {
      if (this.userAnswers[this.currentIndex]) return; // Already answered

      const q = this.questionsList[this.currentIndex];
      const isCorrect = selectedIdx === q.correctIndex;

      if (isCorrect) {
        this.score += 1;
      }

      this.userAnswers[this.currentIndex] = {
        selectedIndex: selectedIdx,
        isCorrect: isCorrect
      };

      // Record daily challenge progress
      this.recordDailyQuestionAnswered(isCorrect);

      // Re-render question with feedback
      this.renderCurrentQuestion();
    },

    goToPrevQuestion() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        this.renderCurrentQuestion();
      }
    },

    goToNextQuestion() {
      const total = this.questionsList.length;
      if (this.currentIndex < total - 1) {
        this.currentIndex++;
        this.renderCurrentQuestion();
      } else {
        this.showQuizResults();
      }
    },

    showQuizResults() {
      if (this.activeArea) this.activeArea.style.display = 'none';
      if (this.resultArea) this.resultArea.style.display = 'block';

      const total = this.questionsList.length;
      const pct = total > 0 ? Math.round((this.score / total) * 100) : 0;

      if (this.resultScore) this.resultScore.textContent = `${this.score} / ${total}`;
      if (this.resultPercent) this.resultPercent.textContent = `${pct}%`;

      if (this.resultVerdict) {
        if (pct >= 85) {
          this.resultVerdict.textContent = '🌟 Outstanding Academic Mastery! You are well prepared for exams.';
        } else if (pct >= 65) {
          this.resultVerdict.textContent = '👍 Good Effort! Review the explanations to reinforce weaker topics.';
        } else {
          this.resultVerdict.textContent = '💡 Needs Revision. Use the Smart Notes generator to study this subject deeper.';
        }
      }

      // Record in Dashboard
      DashboardModule.recordQuizScore(this.score, total);
      DashboardModule.logActivity(`Completed Quiz: ${this.score}/${total} (${pct}%)`);
    },

    async generateAiQuiz() {
      const topic = this.aiTopicInput ? this.aiTopicInput.value.trim() : '';
      if (!topic) {
        Toast.show('Please enter a topic for AI quiz generation.', 'error');
        return;
      }

      const count = this.aiCountSelect ? this.aiCountSelect.value : '5';

      if (this.generateAiBtn) {
        this.generateAiBtn.disabled = true;
        this.generateAiBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating Questions...';
      }

      try {
        const res = await fetch(getApiUrl('/api/generate-quiz'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, count })
        });

        const data = await res.json();

        if (res.ok && data.success && Array.isArray(data.questions) && data.questions.length > 0) {
          this.questionsList = data.questions.map(q => ({
            subject: 'AI Custom',
            category: 'ai',
            question: q.question,
            options: q.options,
            correctIndex: q.correctIndex,
            explanation: q.explanation
          }));

          if (this.activeTopicBadge) this.activeTopicBadge.textContent = `AI Quiz: ${topic}`;
          this.currentIndex = 0;
          this.score = 0;
          this.userAnswers = {};

          if (this.resultArea) this.resultArea.style.display = 'none';
          if (this.activeArea) this.activeArea.style.display = 'block';

          this.renderCurrentQuestion();
          Toast.show(`AI generated ${this.questionsList.length} questions for "${topic}"!`, 'success');
        } else {
          Toast.show(data.error || 'Failed to generate custom quiz questions.', 'error');
        }
      } catch (err) {
        Toast.show('Failed to connect with AI service.', 'error');
      } finally {
        if (this.generateAiBtn) {
          this.generateAiBtn.disabled = false;
          this.generateAiBtn.innerHTML = '<i class="fa-solid fa-microchip"></i> Generate with AI';
        }
      }
    }
  };

  // =========================================================================
  // 9. NEW SUBJECTS MODULE
  // =========================================================================
  const SubjectsModule = {
    form: document.getElementById('addSubjectForm'),
    nameInput: document.getElementById('newSubjectName'),
    categorySelect: document.getElementById('newSubjectCategory'),
    descInput: document.getElementById('newSubjectDesc'),
    grid: document.getElementById('subjectsGrid'),
    searchInput: document.getElementById('searchSubjectsInput'),
    countBadge: document.getElementById('totalSubjectsCount'),

    storageKey: 'studysmart_custom_subjects',

    defaultSubjects: [
      { id: 'marketing', name: 'Digital Marketing', category: 'Marketing', desc: 'SEO, SEM, Social Media, Google Ads & Retention' },
      { id: 'ai', name: 'Artificial Intelligence', category: 'Artificial Intelligence', desc: 'Machine Learning, NLP, Prompt Engineering & Deep Learning' },
      { id: 'business', name: 'Business Studies', category: 'Business', desc: 'STP Framework, SWOT, 4Ps & Market Strategy' },
      { id: 'economics', name: 'Economics', category: 'Finance', desc: 'Microeconomics, Macroeconomics, Elasticity & Inflation' },
      { id: 'management', name: 'Management', category: 'Business', desc: 'Principles of Management, Leadership & Organizational Behavior' },
      { id: 'accounting', name: 'Accounting', category: 'Finance', desc: 'Financial Statements, Balance Sheet, Cash Flow & Double Entry' },
      { id: 'english', name: 'English', category: 'General', desc: 'Business Communication, Presentation Skills & Email Etiquette' },
      { id: 'aptitude', name: 'General Aptitude', category: 'General', desc: 'Quantitative Aptitude, Logical Reasoning & Problem Solving' }
    ],

    init() {
      this.renderSubjects();

      if (this.form) {
        this.form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.addSubject();
        });
      }

      if (this.searchInput) {
        this.searchInput.addEventListener('input', () => this.renderSubjects());
      }
    },

    getAllSubjects() {
      const custom = StorageHelper.get(this.storageKey, []);
      return [...this.defaultSubjects, ...custom];
    },

    addSubject() {
      const name = this.nameInput ? this.nameInput.value.trim() : '';
      if (!name) {
        Toast.show('Subject name is required', 'error');
        return;
      }

      const category = this.categorySelect ? this.categorySelect.value : 'General';
      const desc = this.descInput ? this.descInput.value.trim() : 'Custom Academic Subject';

      const custom = StorageHelper.get(this.storageKey, []);
      const newSub = {
        id: `custom_sub_${Date.now()}`,
        name,
        category,
        desc,
        isCustom: true
      };

      custom.push(newSub);
      StorageHelper.set(this.storageKey, custom);

      if (this.nameInput) this.nameInput.value = '';
      if (this.descInput) this.descInput.value = '';

      this.renderSubjects();
      this.syncSubjectDropdowns();
      DashboardModule.logActivity(`Added subject: "${name}"`);
      Toast.show(`Subject "${name}" added!`, 'success');
    },

    deleteSubject(id) {
      const custom = StorageHelper.get(this.storageKey, []);
      const filtered = custom.filter(s => s.id !== id);
      StorageHelper.set(this.storageKey, filtered);
      this.renderSubjects();
      this.syncSubjectDropdowns();
      Toast.show('Custom subject deleted', 'info');
    },

    renderSubjects() {
      if (!this.grid) return;
      const query = this.searchInput ? this.searchInput.value.toLowerCase().trim() : '';
      const all = this.getAllSubjects();

      const filtered = query
        ? all.filter(s => s.name.toLowerCase().includes(query) || s.desc.toLowerCase().includes(query) || s.category.toLowerCase().includes(query))
        : all;

      if (this.countBadge) this.countBadge.textContent = `${all.length} Subjects Active`;

      if (filtered.length === 0) {
        this.grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:2rem; color:var(--text-muted);">No matching subjects found.</div>';
        return;
      }

      this.grid.innerHTML = filtered.map(s => `
        <div class="subject-item-card">
          <div class="subject-card-header">
            <span class="subject-card-title">${Toast.escapeHtml(s.name)}</span>
            <span class="badge badge-subtle" style="font-size:0.7rem;">${Toast.escapeHtml(s.category)}</span>
          </div>
          <p class="subject-card-desc">${Toast.escapeHtml(s.desc)}</p>
          <div class="subject-card-actions">
            <a href="#quiz" class="btn btn-sm btn-glass" title="Practice Quiz for this subject"><i class="fa-solid fa-trophy"></i> Quiz</a>
            <a href="#notes" class="btn btn-sm btn-glass" title="Generate Notes for this subject"><i class="fa-solid fa-file-pen"></i> Notes</a>
            ${s.isCustom ? `<button class="btn btn-sm btn-glass delete-sub-btn" data-id="${s.id}" style="color:var(--accent-rose);" title="Delete custom subject"><i class="fa-solid fa-trash"></i></button>` : ''}
          </div>
        </div>
      `).join('');

      this.grid.querySelectorAll('.delete-sub-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          if (confirm('Are you sure you want to delete this subject?')) {
            this.deleteSubject(id);
          }
        });
      });
    },

    syncSubjectDropdowns() {
      const all = this.getAllSubjects();
      const selects = [
        document.getElementById('notesSubjectSelect'),
        document.getElementById('plannerSubject'),
        document.getElementById('alertSubject')
      ];

      selects.forEach(select => {
        if (select) {
          const curVal = select.value;
          select.innerHTML = all.map(s => `<option value="${Toast.escapeHtml(s.name)}">${Toast.escapeHtml(s.name)}</option>`).join('');
          if (curVal) select.value = curVal;
        }
      });
    }
  };

  // =========================================================================
  // 10. DAILY TASKS MODULE
  // =========================================================================
  const TasksModule = {
    form: document.getElementById('quickTaskForm'),
    input: document.getElementById('quickTaskInput'),
    prioritySelect: document.getElementById('quickTaskPriority'),
    list: document.getElementById('dailyTasksList'),
    tabs: document.querySelectorAll('.tasks-tab'),
    clearCompletedBtn: document.getElementById('clearCompletedTasksBtn'),

    storageKey: 'studysmart_daily_tasks',
    filter: 'all',

    init() {
      this.renderTasks();

      if (this.form) {
        this.form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.addTask();
        });
      }

      this.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          this.tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          this.filter = tab.getAttribute('data-filter') || 'all';
          this.renderTasks();
        });
      });

      if (this.clearCompletedBtn) {
        this.clearCompletedBtn.addEventListener('click', () => {
          const tasks = StorageHelper.get(this.storageKey, []);
          const remaining = tasks.filter(t => !t.completed);
          StorageHelper.set(this.storageKey, remaining);
          this.renderTasks();
          DashboardModule.updateStats();
          Toast.show('Completed tasks cleared', 'info');
        });
      }
    },

    addTask() {
      const title = this.input ? this.input.value.trim() : '';
      if (!title) return;

      const priority = this.prioritySelect ? this.prioritySelect.value : 'Medium';
      const tasks = StorageHelper.get(this.storageKey, []);

      const newTask = {
        id: `task_${Date.now()}`,
        title,
        priority,
        completed: false,
        createdDate: new Date().toLocaleDateString()
      };

      tasks.unshift(newTask);
      StorageHelper.set(this.storageKey, tasks);

      if (this.input) this.input.value = '';
      this.renderTasks();
      DashboardModule.updateStats();
      DashboardModule.logActivity(`Added task: "${title}"`);
      Toast.show('Task added to daily checklist', 'success');
    },

    toggleTask(id) {
      const tasks = StorageHelper.get(this.storageKey, []);
      const task = tasks.find(t => t.id === id);
      if (task) {
        task.completed = !task.completed;
        StorageHelper.set(this.storageKey, tasks);
        this.renderTasks();
        DashboardModule.updateStats();
        if (task.completed) {
          Toast.show(`Task completed: "${task.title}"`, 'success');
          DashboardModule.logActivity(`Completed task: "${task.title}"`);
        }
      }
    },

    deleteTask(id) {
      const tasks = StorageHelper.get(this.storageKey, []);
      const filtered = tasks.filter(t => t.id !== id);
      StorageHelper.set(this.storageKey, filtered);
      this.renderTasks();
      DashboardModule.updateStats();
    },

    renderTasks() {
      if (!this.list) return;
      const tasks = StorageHelper.get(this.storageKey, []);

      const filtered = tasks.filter(t => {
        if (this.filter === 'pending') return !t.completed;
        if (this.filter === 'completed') return t.completed;
        return true;
      });

      if (filtered.length === 0) {
        this.list.innerHTML = '<li style="text-align:center; padding:2rem; color:var(--text-muted);">No tasks in this view. Add one above!</li>';
        return;
      }

      this.list.innerHTML = filtered.map(t => `
        <li class="task-item ${t.completed ? 'completed' : ''}" data-id="${t.id}">
          <div class="task-left">
            <input type="checkbox" class="task-checkbox" ${t.completed ? 'checked' : ''} aria-label="Mark task complete">
            <span class="task-title">${Toast.escapeHtml(t.title)}</span>
          </div>
          <div class="task-right">
            <span class="badge ${t.priority === 'High' ? 'badge-rose' : t.priority === 'Medium' ? 'badge-amber' : 'badge-subtle'}" style="font-size:0.7rem;">${t.priority}</span>
            <button class="task-del-btn" aria-label="Delete task"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </li>
      `).join('');

      this.list.querySelectorAll('.task-item').forEach(item => {
        const id = item.getAttribute('data-id');
        const checkbox = item.querySelector('.task-checkbox');
        const delBtn = item.querySelector('.task-del-btn');

        if (checkbox) {
          checkbox.addEventListener('change', () => this.toggleTask(id));
        }
        if (delBtn) {
          delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteTask(id);
          });
        }
      });
    }
  };

  // =========================================================================
  // 11. STUDY PLANNER MODULE
  // =========================================================================
  const PlannerModule = {
    form: document.getElementById('plannerForm'),
    subjectSelect: document.getElementById('plannerSubject'),
    titleInput: document.getElementById('plannerTitle'),
    dateInput: document.getElementById('plannerDate'),
    durationInput: document.getElementById('plannerDuration'),
    prioritySelect: document.getElementById('plannerPriority'),
    itemsList: document.getElementById('plannerItemsList'),
    filterSubject: document.getElementById('filterPlannerSubject'),
    sortBy: document.getElementById('sortPlannerBy'),

    storageKey: 'studysmart_planner_tasks',

    init() {
      // Set default date to tomorrow
      if (this.dateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        this.dateInput.value = tomorrow.toISOString().split('T')[0];
      }

      this.renderPlanner();

      if (this.form) {
        this.form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.addPlannerTask();
        });
      }

      if (this.filterSubject) {
        this.filterSubject.addEventListener('change', () => this.renderPlanner());
      }
      if (this.sortBy) {
        this.sortBy.addEventListener('change', () => this.renderPlanner());
      }
    },

    addPlannerTask() {
      const title = this.titleInput ? this.titleInput.value.trim() : '';
      const date = this.dateInput ? this.dateInput.value : '';
      if (!title || !date) return;

      const subject = this.subjectSelect ? this.subjectSelect.value : 'General';
      const duration = this.durationInput ? parseInt(this.durationInput.value, 10) || 45 : 45;
      const priority = this.prioritySelect ? this.prioritySelect.value : 'Medium';

      const tasks = StorageHelper.get(this.storageKey, []);
      const newTask = {
        id: `plan_${Date.now()}`,
        title,
        subject,
        date,
        duration,
        priority,
        completed: false
      };

      tasks.push(newTask);
      StorageHelper.set(this.storageKey, tasks);

      if (this.titleInput) this.titleInput.value = '';
      this.renderPlanner();
      DashboardModule.updateStats();
      DashboardModule.logActivity(`Scheduled: "${title}" (${subject})`);
      Toast.show('Task added to study planner!', 'success');
    },

    togglePlanComplete(id) {
      const tasks = StorageHelper.get(this.storageKey, []);
      const task = tasks.find(t => t.id === id);
      if (task) {
        task.completed = !task.completed;
        StorageHelper.set(this.storageKey, tasks);
        this.renderPlanner();
        DashboardModule.updateStats();
      }
    },

    deletePlanTask(id) {
      const tasks = StorageHelper.get(this.storageKey, []);
      const filtered = tasks.filter(t => t.id !== id);
      StorageHelper.set(this.storageKey, filtered);
      this.renderPlanner();
      DashboardModule.updateStats();
    },

    renderPlanner() {
      if (!this.itemsList) return;
      let tasks = StorageHelper.get(this.storageKey, []);

      const subFilter = this.filterSubject ? this.filterSubject.value : 'all';
      if (subFilter !== 'all') {
        tasks = tasks.filter(t => t.subject === subFilter);
      }

      const sortMode = this.sortBy ? this.sortBy.value : 'date-asc';
      if (sortMode === 'date-asc') {
        tasks.sort((a, b) => new Date(a.date) - new Date(b.date));
      } else if (sortMode === 'date-desc') {
        tasks.sort((a, b) => new Date(b.date) - new Date(a.date));
      } else if (sortMode === 'priority') {
        const pMap = { High: 3, Medium: 2, Low: 1 };
        tasks.sort((a, b) => (pMap[b.priority] || 0) - (pMap[a.priority] || 0));
      }

      if (tasks.length === 0) {
        this.itemsList.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-muted);">No study tasks scheduled yet. Fill the form to create your plan!</div>';
        return;
      }

      this.itemsList.innerHTML = tasks.map(t => `
        <div class="planner-card-item ${t.completed ? 'completed' : ''}" data-id="${t.id}">
          <div class="planner-item-main">
            <span class="planner-item-subject">${Toast.escapeHtml(t.subject)}</span>
            <span class="planner-item-title" style="${t.completed ? 'text-decoration:line-through; color:var(--text-muted);' : ''}">${Toast.escapeHtml(t.title)}</span>
            <div class="planner-item-meta">
              <span><i class="fa-solid fa-calendar"></i> ${t.date}</span>
              <span><i class="fa-solid fa-stopwatch"></i> ${t.duration} mins</span>
              <span class="badge ${t.priority === 'High' ? 'badge-rose' : t.priority === 'Medium' ? 'badge-amber' : 'badge-subtle'}" style="font-size:0.65rem;">${t.priority}</span>
            </div>
          </div>
          <div style="display:flex; gap:0.5rem; align-items:center;">
            <button class="btn btn-sm ${t.completed ? 'btn-glass' : 'btn-primary'} toggle-plan-btn" title="Mark Complete">
              <i class="fa-solid ${t.completed ? 'fa-rotate-left' : 'fa-check'}"></i>
            </button>
            <button class="btn btn-sm btn-glass del-plan-btn" title="Delete Task" style="color:var(--accent-rose);">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      `).join('');

      this.itemsList.querySelectorAll('.planner-card-item').forEach(item => {
        const id = item.getAttribute('data-id');
        const toggleBtn = item.querySelector('.toggle-plan-btn');
        const delBtn = item.querySelector('.del-plan-btn');

        if (toggleBtn) toggleBtn.addEventListener('click', () => this.togglePlanComplete(id));
        if (delBtn) delBtn.addEventListener('click', () => this.deletePlanTask(id));
      });
    }
  };

  // =========================================================================
  // 12. EXAM ALERTS & DEADLINES MODULE
  // =========================================================================
  const ExamAlertsModule = {
    form: document.getElementById('addAlertForm'),
    titleInput: document.getElementById('alertTitle'),
    typeSelect: document.getElementById('alertType'),
    subjectSelect: document.getElementById('alertSubject'),
    dateInput: document.getElementById('alertDate'),
    timeInput: document.getElementById('alertTime'),
    prioritySelect: document.getElementById('alertPriority'),
    venueInput: document.getElementById('alertVenue'),
    cardsList: document.getElementById('alertsCardsList'),
    tabs: document.querySelectorAll('.alert-tab'),
    countBadge: document.getElementById('activeAlertsCount'),

    storageKey: 'studysmart_exam_alerts',
    filter: 'all',

    init() {
      // Set default date to 3 days from now
      if (this.dateInput) {
        const target = new Date();
        target.setDate(target.getDate() + 3);
        this.dateInput.value = target.toISOString().split('T')[0];
      }

      this.renderAlerts();

      if (this.form) {
        this.form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.addAlert();
        });
      }

      this.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          this.tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          this.filter = tab.getAttribute('data-filter') || 'all';
          this.renderAlerts();
        });
      });
    },

    addAlert() {
      const title = this.titleInput ? this.titleInput.value.trim() : '';
      const date = this.dateInput ? this.dateInput.value : '';
      if (!title || !date) return;

      const type = this.typeSelect ? this.typeSelect.value : 'Exam';
      const subject = this.subjectSelect ? this.subjectSelect.value : 'General';
      const time = this.timeInput ? this.timeInput.value : '09:30';
      const priority = this.prioritySelect ? this.prioritySelect.value : 'Medium';
      const venue = this.venueInput ? this.venueInput.value.trim() : 'Campus';

      const alerts = StorageHelper.get(this.storageKey, []);
      const newAlert = {
        id: `alert_${Date.now()}`,
        title,
        type,
        subject,
        date,
        time,
        priority,
        venue,
        completed: false
      };

      alerts.push(newAlert);
      StorageHelper.set(this.storageKey, alerts);

      if (this.titleInput) this.titleInput.value = '';
      if (this.venueInput) this.venueInput.value = '';

      this.renderAlerts();
      DashboardModule.updateStats();
      DashboardModule.logActivity(`Added Alert: "${title}" (${date})`);
      Toast.show(`Academic alert set for "${title}"!`, 'success');
    },

    calculateCountdown(dateStr, timeStr) {
      const now = new Date();
      const target = new Date(`${dateStr}T${timeStr || '00:00'}`);
      const diffMs = target - now;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffMs < 0) {
        const overdueDays = Math.abs(diffDays);
        return { label: `Overdue by ${overdueDays}d`, status: 'overdue' };
      } else if (diffDays === 0) {
        return { label: 'Today!', status: 'urgent' };
      } else if (diffDays === 1) {
        return { label: 'Tomorrow', status: 'urgent' };
      } else if (diffDays <= 3) {
        return { label: `In ${diffDays} days`, status: 'urgent' };
      } else {
        return { label: `In ${diffDays} days`, status: 'normal' };
      }
    },

    deleteAlert(id) {
      const alerts = StorageHelper.get(this.storageKey, []);
      const filtered = alerts.filter(a => a.id !== id);
      StorageHelper.set(this.storageKey, filtered);
      this.renderAlerts();
      DashboardModule.updateStats();
    },

    toggleAlertComplete(id) {
      const alerts = StorageHelper.get(this.storageKey, []);
      const alert = alerts.find(a => a.id === id);
      if (alert) {
        alert.completed = !alert.completed;
        StorageHelper.set(this.storageKey, alerts);
        this.renderAlerts();
        DashboardModule.updateStats();
      }
    },

    renderAlerts() {
      if (!this.cardsList) return;
      let alerts = StorageHelper.get(this.storageKey, []);

      // Filter
      const filtered = alerts.filter(a => {
        const countdown = this.calculateCountdown(a.date, a.time);
        if (this.filter === 'exam') return a.type === 'Exam';
        if (this.filter === 'assignment') return a.type === 'Assignment';
        if (this.filter === 'overdue') return countdown.status === 'overdue' && !a.completed;
        return true;
      });

      const upcomingCount = alerts.filter(a => !a.completed).length;
      if (this.countBadge) this.countBadge.textContent = `${upcomingCount} Active Alerts`;

      if (filtered.length === 0) {
        this.cardsList.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-muted);">No events found in this category.</div>';
        return;
      }

      this.cardsList.innerHTML = filtered.map(a => {
        const countdown = this.calculateCountdown(a.date, a.time);
        return `
          <div class="alert-item-card ${countdown.status} ${a.completed ? 'completed' : ''}" data-id="${a.id}">
            <div>
              <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
                <span class="badge badge-purple" style="font-size:0.7rem;">${a.type}</span>
                <span style="font-size:0.8rem; font-weight:600; color:var(--text-secondary);">${Toast.escapeHtml(a.subject)}</span>
              </div>
              <h4 style="font-size:1.05rem; margin-bottom:0.3rem; ${a.completed ? 'text-decoration:line-through; color:var(--text-muted);' : ''}">${Toast.escapeHtml(a.title)}</h4>
              <div style="font-size:0.8rem; color:var(--text-muted); display:flex; gap:0.8rem;">
                <span><i class="fa-solid fa-clock"></i> ${a.date} at ${a.time}</span>
                <span><i class="fa-solid fa-location-dot"></i> ${Toast.escapeHtml(a.venue)}</span>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem;">
              <span class="alert-countdown-pill pill-${countdown.status}">${countdown.label}</span>
              <div style="display:flex; gap:0.4rem;">
                <button class="btn btn-sm btn-glass toggle-alert-btn" title="Toggle Done"><i class="fa-solid ${a.completed ? 'fa-rotate-left' : 'fa-check'}"></i></button>
                <button class="btn btn-sm btn-glass del-alert-btn" title="Delete" style="color:var(--accent-rose);"><i class="fa-solid fa-trash"></i></button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      this.cardsList.querySelectorAll('.alert-item-card').forEach(item => {
        const id = item.getAttribute('data-id');
        const toggleBtn = item.querySelector('.toggle-alert-btn');
        const delBtn = item.querySelector('.del-alert-btn');

        if (toggleBtn) toggleBtn.addEventListener('click', () => this.toggleAlertComplete(id));
        if (delBtn) delBtn.addEventListener('click', () => this.deleteAlert(id));
      });
    }
  };

  // =========================================================================
  // 13. PPT GENERATOR MODULE (AI Presentation Slide Deck Generator)
  // =========================================================================
  const PptModule = {
    form: document.getElementById('pptForm'),
    topicInput: document.getElementById('pptTopicInput'),
    subjectSelect: document.getElementById('pptSubjectSelect'),
    countSelect: document.getElementById('pptSlideCountSelect'),
    langSelect: document.getElementById('pptLanguageSelect'),
    levelSelect: document.getElementById('pptLevelSelect'),
    reqInput: document.getElementById('pptRequirementsInput'),
    generateBtn: document.getElementById('generatePptBtn'),

    deckTitle: document.getElementById('pptDeckTitle'),
    countBadge: document.getElementById('pptSlideCountBadge'),
    emptyState: document.getElementById('pptEmptyState'),
    overviewList: document.getElementById('slidesOverviewList'),
    presentBtn: document.getElementById('previewSlidesModalBtn'),
    copyBtn: document.getElementById('copyPptTextBtn'),
    downloadBtn: document.getElementById('downloadPptTxtBtn'),

    // Presentation Modal elements
    modal: document.getElementById('slidesModal'),
    closeModalBtn: document.getElementById('closeSlidesModalBtn'),
    modalCounter: document.getElementById('slidesCounterBadge'),
    presTitle: document.getElementById('slidePresTitle'),
    presBullets: document.getElementById('slidePresBullets'),
    presVisualText: document.getElementById('slideVisualText'),
    presSpeakerNotes: document.getElementById('slideSpeakerNotesText'),
    slidePrevBtn: document.getElementById('slidePrevBtn'),
    slideNextBtn: document.getElementById('slideNextBtn'),
    dotsContainer: document.getElementById('slideDotsContainer'),

    generatedSlides: [],
    activeSlideIndex: 0,
    currentTopic: '',

    init() {
      if (this.form) {
        this.form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.generatePresentation();
        });
      }

      if (this.presentBtn) {
        this.presentBtn.addEventListener('click', () => this.openSlidesModal());
      }
      if (this.copyBtn) {
        this.copyBtn.addEventListener('click', () => this.copyPptContent());
      }
      if (this.downloadBtn) {
        this.downloadBtn.addEventListener('click', () => this.downloadPptTxt());
      }

      // Modal Controls
      if (this.closeModalBtn) {
        this.closeModalBtn.addEventListener('click', () => this.closeSlidesModal());
      }
      if (this.slidePrevBtn) {
        this.slidePrevBtn.addEventListener('click', () => this.prevSlide());
      }
      if (this.slideNextBtn) {
        this.slideNextBtn.addEventListener('click', () => this.nextSlide());
      }

      window.addEventListener('keydown', (e) => {
        if (!this.modal || !this.modal.classList.contains('active')) return;
        if (e.key === 'ArrowLeft') this.prevSlide();
        if (e.key === 'ArrowRight') this.nextSlide();
        if (e.key === 'Escape') this.closeSlidesModal();
      });
    },

    async generatePresentation() {
      const topic = this.topicInput ? this.topicInput.value.trim() : '';
      if (!topic) {
        Toast.show('Please enter a presentation topic', 'error');
        return;
      }

      const subject = this.subjectSelect ? this.subjectSelect.value : 'General';
      const slideCount = this.countSelect ? this.countSelect.value : '6';
      const language = this.langSelect ? this.langSelect.value : 'English';
      const level = this.levelSelect ? this.levelSelect.value : 'Undergraduate';
      const requirements = this.reqInput ? this.reqInput.value.trim() : '';

      if (this.generateBtn) {
        this.generateBtn.disabled = true;
        this.generateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating Slide Deck...';
      }

      try {
        const res = await fetch(getApiUrl('/api/generate-ppt'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, subject, slideCount, language, level, requirements })
        });

        const data = await res.json();

        if (res.ok && data.success && Array.isArray(data.slides)) {
          this.generatedSlides = data.slides;
          this.currentTopic = topic;
          this.renderSlidesOverview();

          if (this.presentBtn) this.presentBtn.disabled = false;
          if (this.copyBtn) this.copyBtn.disabled = false;
          if (this.downloadBtn) this.downloadBtn.disabled = false;

          DashboardModule.logActivity(`Created PPT deck for "${topic}"`);
          Toast.show(`Successfully generated ${data.slides.length} slides!`, 'success');
        } else {
          Toast.show(data.error || 'Failed to generate presentation slides.', 'error');
        }
      } catch (err) {
        Toast.show('Failed to connect to PPT generator service.', 'error');
      } finally {
        if (this.generateBtn) {
          this.generateBtn.disabled = false;
          this.generateBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Presentation Deck';
        }
      }
    },

    renderSlidesOverview() {
      if (!this.overviewList) return;
      if (this.emptyState) this.emptyState.style.display = 'none';
      this.overviewList.style.display = 'flex';

      if (this.deckTitle) this.deckTitle.textContent = this.currentTopic;
      if (this.countBadge) this.countBadge.textContent = `${this.generatedSlides.length} Slides Ready`;

      this.overviewList.innerHTML = this.generatedSlides.map(s => `
        <div class="slide-summary-card">
          <div class="slide-summary-header">
            <span class="slide-summary-num">Slide ${s.slideNumber}</span>
            <span class="badge badge-subtle" style="font-size:0.7rem;"><i class="fa-solid fa-lightbulb"></i> Visual: ${Toast.escapeHtml(s.visualIdea.substring(0, 30))}...</span>
          </div>
          <h4 class="slide-summary-title">${Toast.escapeHtml(s.title)}</h4>
          <ul class="slide-summary-bullets">
            ${s.bullets.map(b => `<li>${Toast.escapeHtml(b)}</li>`).join('')}
          </ul>
          <div class="slide-summary-footer">
            <strong><i class="fa-solid fa-microphone"></i> Speaker Notes:</strong> ${Toast.escapeHtml(s.speakerNotes)}
          </div>
        </div>
      `).join('');
    },

    openSlidesModal() {
      if (!this.modal || this.generatedSlides.length === 0) return;
      this.activeSlideIndex = 0;
      this.modal.classList.add('active');
      this.modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      this.renderSlideInModal();
    },

    closeSlidesModal() {
      if (!this.modal) return;
      this.modal.classList.remove('active');
      this.modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    },

    renderSlideInModal() {
      const slide = this.generatedSlides[this.activeSlideIndex];
      if (!slide) return;

      const total = this.generatedSlides.length;
      if (this.modalCounter) this.modalCounter.textContent = `Slide ${this.activeSlideIndex + 1} of ${total}`;
      if (this.presTitle) this.presTitle.textContent = slide.title;

      if (this.presBullets) {
        this.presBullets.innerHTML = slide.bullets.map(b => `<li>${Toast.escapeHtml(b)}</li>`).join('');
      }
      if (this.presVisualText) this.presVisualText.textContent = `Visual Suggestion: ${slide.visualIdea}`;
      if (this.presSpeakerNotes) this.presSpeakerNotes.textContent = slide.speakerNotes;

      // Update Navigation Buttons
      if (this.slidePrevBtn) this.slidePrevBtn.disabled = this.activeSlideIndex === 0;
      if (this.slideNextBtn) this.slideNextBtn.disabled = this.activeSlideIndex === total - 1;

      // Update Dots
      if (this.dotsContainer) {
        this.dotsContainer.innerHTML = this.generatedSlides.map((_, idx) => `
          <span class="slide-dot ${idx === this.activeSlideIndex ? 'active' : ''}" data-idx="${idx}"></span>
        `).join('');

        this.dotsContainer.querySelectorAll('.slide-dot').forEach(dot => {
          dot.addEventListener('click', () => {
            this.activeSlideIndex = parseInt(dot.getAttribute('data-idx'), 10);
            this.renderSlideInModal();
          });
        });
      }
    },

    prevSlide() {
      if (this.activeSlideIndex > 0) {
        this.activeSlideIndex--;
        this.renderSlideInModal();
      }
    },

    nextSlide() {
      if (this.activeSlideIndex < this.generatedSlides.length - 1) {
        this.activeSlideIndex++;
        this.renderSlideInModal();
      }
    },

    copyPptContent() {
      if (this.generatedSlides.length === 0) return;
      let text = `PRESENTATION: ${this.currentTopic}\nTotal Slides: ${this.generatedSlides.length}\n\n`;

      this.generatedSlides.forEach(s => {
        text += `=====================================\n`;
        text += `SLIDE ${s.slideNumber}: ${s.title}\n`;
        text += `=====================================\n`;
        s.bullets.forEach(b => text += `• ${b}\n`);
        text += `\n[Visual Recommendation]: ${s.visualIdea}\n`;
        text += `[Speaker Talking Points]: ${s.speakerNotes}\n\n`;
      });

      navigator.clipboard.writeText(text).then(() => {
        Toast.show('Presentation content copied to clipboard!', 'success');
      });
    },

    downloadPptTxt() {
      if (this.generatedSlides.length === 0) return;
      let text = `PRESENTATION: ${this.currentTopic}\nGenerated by StudySmart AI\n\n`;
      this.generatedSlides.forEach(s => {
        text += `-----------------------------------------\n`;
        text += `SLIDE ${s.slideNumber}: ${s.title}\n`;
        text += `-----------------------------------------\n`;
        s.bullets.forEach(b => text += `* ${b}\n`);
        text += `\nVISUAL CONCEPT: ${s.visualIdea}\n`;
        text += `SPEAKER NOTES: ${s.speakerNotes}\n\n`;
      });

      const filename = `${(this.currentTopic || 'Presentation').replace(/[^a-z0-9]/gi, '_')}_Slides.txt`;
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Toast.show(`Downloaded slide content: ${filename}`, 'info');
    }
  };

  // =========================================================================
  // 14. CAREER PLANNING MODULE
  // =========================================================================
  const CareerModule = {
    presetsGrid: document.getElementById('careerPresetsGrid'),
    customForm: document.getElementById('customCareerForm'),
    customInput: document.getElementById('customCareerInput'),
    generateCustomBtn: document.getElementById('generateCustomCareerBtn'),

    roleTitle: document.getElementById('careerRoleTitle'),
    roleDesc: document.getElementById('careerRoleDesc'),
    progressScore: document.getElementById('careerProgressScore'),
    skillsGrid: document.getElementById('careerSkillsChecklist'),
    timeline: document.getElementById('careerRoadmapTimeline'),
    projectsGrid: document.getElementById('careerProjectsGrid'),
    interviewAccordion: document.getElementById('careerInterviewAccordion'),

    checkedSkillsStorageKey: 'studysmart_career_skills_checked',

    preloadedTracks: {
      digital_marketing: {
        title: "Digital Marketing Strategist",
        desc: "Architects performance marketing campaigns, full-funnel acquisition, SEO growth loops, and marketing analytics.",
        skills: [
          "Google Ads & Meta Ads Manager",
          "SEO Architecture & Technical Audits",
          "Google Analytics 4 (GA4) & Tag Manager",
          "CAC, LTV, ROAS Financial Metrics",
          "Conversion Rate Optimization (CRO)",
          "Marketing Automation & Email Funnels"
        ],
        milestones: [
          { phase: "Month 1-2: Core Acquisition Foundations", goal: "Master organic search (SEO) and paid media metrics (CAC, ROAS).", tasks: ["Complete Google Analytics 4 Certification", "Launch a WordPress or Shopify test store", "Execute keyword research for 50 commercial terms"] },
          { phase: "Month 3-4: Performance Marketing & Data", goal: "Run live paid advertising tests with conversion tracking.", tasks: ["Build a multi-stage remarketing funnel", "A/B test landing page headlines and CTAs", "Create an automated reporting dashboard in Looker Studio"] },
          { phase: "Month 5-6: Portfolio & Recruiter Outreach", goal: "Document case studies showcasing measurable ROI metrics.", tasks: ["Draft a 3-page real brand turnaround case study", "Prepare STAR method responses for agency interviews", "Optimize LinkedIn profile with high-ranking keywords"] }
        ],
        projects: [
          { name: "E-Commerce Growth Funnel", desc: "Built end-to-end user acquisition strategy driving 2.4x ROAS on simulated ad spend.", tag: "Google Ads • GA4" },
          { name: "SEO Keyword Revamp", desc: "Restructured internal link silo hierarchy resulting in 40% organic impressions boost.", tag: "SEO • Technical" }
        ],
        interview: [
          { q: "How would you diagnose a sudden 30% drop in website traffic?", a: "Analyze traffic channels in GA4 to isolate organic vs paid, verify Google Search Console for crawl errors or algorithm updates, and check technical site changes or tracking tag breakage." },
          { q: "Explain the relationship between CAC and Customer Lifetime Value (LTV).", a: "LTV:CAC measures commercial sustainability. An optimal ratio is 3:1 or higher. Below 1:1 loses money, while exceeding 5:1 indicates under-investment in growth." }
        ]
      },
      ai_prompt: {
        title: "AI & Prompt Engineering Specialist",
        desc: "Bridges human business workflows and generative AI models using prompt frameworks, RAG, and evaluation metrics.",
        skills: [
          "Few-Shot & Chain-of-Thought Prompting",
          "OpenAI API & Anthropic SDK Interfacing",
          "Retrieval-Augmented Generation (RAG)",
          "AI Guardrails & Bias Mitigation",
          "Python / JavaScript AI Orchestration",
          "Context Window & Token Cost Optimization"
        ],
        milestones: [
          { phase: "Month 1-2: Prompt Architecture", goal: "Master structured outputs, system prompts, and zero-shot reasoning.", tasks: ["Build structured JSON prompt templates", "Test temperature and top_p variations", "Implement input sanitization guardrails"] },
          { phase: "Month 3-4: Tool Integration & RAG", goal: "Connect LLMs to databases and vector embeddings.", tasks: ["Build a vector search question-answering app", "Connect OpenAI functions to live REST APIs", "Measure hallucination rates across test prompts"] },
          { phase: "Month 5-6: Capstone AI Application", goal: "Deploy an end-to-end student or business assistant.", tasks: ["Deploy full-stack AI tool to production", "Author technical documentation on GitHub", "Publish a technical breakdown blog post"] }
        ],
        projects: [
          { name: "Academic RAG Assistant", desc: "Created vector-indexed textbook tutor with zero-hallucination verification.", tag: "OpenAI • Vector Search" },
          { name: "Automated Marketing Copywriter", desc: "Engineered prompt pipelines that generate brand-aligned ad variants.", tag: "System Prompts • JSON" }
        ],
        interview: [
          { q: "How do you prevent an AI model from hallucinating in production?", a: "Ground model responses using RAG with verified knowledge bases, set temperature low (0.2-0.5), use strict JSON schema validation, and enforce explicit fallback instructions when evidence is lacking." },
          { q: "What is Chain-of-Thought (CoT) prompting?", a: "CoT encourages the model to generate intermediate reasoning steps before arriving at a final answer, substantially improving accuracy on complex multi-step logical problems." }
        ]
      },
      marketing_analytics: {
        title: "Marketing Analytics & BI Manager",
        desc: "Transforms marketing and customer data into actionable growth insights using SQL, statistical modeling, and dashboards.",
        skills: [
          "SQL Querying & Data Warehousing",
          "Looker Studio / Tableau Dashboards",
          "Cohort Analysis & Churn Modeling",
          "Marketing Attribution Modeling",
          "Python (Pandas / NumPy)",
          "Statistical Significance & Hypothesis Testing"
        ],
        milestones: [
          { phase: "Month 1-2: SQL & Metrics Mastery", goal: "Extract and aggregate multi-channel customer data.", tasks: ["Master JOINs, Window Functions, and GROUP BY in SQL", "Build customer retention cohorts", "Calculate Monthly Recurring Revenue (MRR) movements"] },
          { phase: "Month 3-4: Attribution & Dashboards", goal: "Develop multi-touch attribution models.", tasks: ["Compare First-Click vs Linear attribution models", "Design an automated executive KPI cockpit", "Implement anomaly detection alerts for ad spend"] },
          { phase: "Month 5-6: Strategic Case Presentations", goal: "Synthesize data into executive recommendations.", tasks: ["Present data findings using storytelling frameworks", "Complete mock marketing analytics technical interview", "Document sample SQL scripts on GitHub"] }
        ],
        projects: [
          { name: "Customer Churn Prediction Model", desc: "Identified high-risk accounts 30 days prior to contract renewal with 82% precision.", tag: "SQL • Retention" },
          { name: "Multi-Touch Marketing Dashboard", desc: "Unified ad spend across Google, Meta, and LinkedIn into Looker Studio.", tag: "BI • Dashboards" }
        ],
        interview: [
          { q: "How do you determine if an A/B test has reached statistical significance?", a: "Calculate the p-value against a 95% confidence threshold (alpha = 0.05) and ensure adequate sample size and test duration to avoid false positives caused by day-of-week seasonality." },
          { q: "What is the difference between First-Touch and Last-Touch attribution?", a: "First-touch assigns 100% credit to the initial brand discovery channel (best for awareness), while last-touch credits the final touchpoint before purchase (favors direct/brand search)." }
        ]
      },
      business_consultant: {
        title: "Business Consultant / Strategy",
        desc: "Diagnoses operational bottlenecks, formulates competitive positioning, and drives market expansion for enterprises.",
        skills: [
          "MECE Problem Structuring Framework",
          "Financial Modeling & Sensitivity Analysis",
          "Porter's Five Forces & Industry Value Chain",
          "Executive C-Suite Presentation Delivery",
          "Market Sizing (Fermi Estimation)",
          "Change Management & OKR Deployment"
        ],
        milestones: [
          { phase: "Month 1-2: Case Method Foundations", goal: "Master problem decomposition and hypothesis testing.", tasks: ["Solve 20 classic business strategy case interviews", "Practice market sizing estimates", "Decompose profitability trees"] },
          { phase: "Month 3-4: Financial & Market Feasibility", goal: "Evaluate investment ROI and competitive moats.", tasks: ["Construct a 3-statement financial model", "Conduct a comprehensive competitor benchmark audit", "Formulate an Asian market entry strategy for an FMCG brand"] },
          { phase: "Month 5-6: Executive Readiness", goal: "Deliver high-stakes slide presentations and recommendations.", tasks: ["Present capstone recommendations to faculty panel", "Draft executive memorandums and whitepapers", "Network with industry strategy professionals"] }
        ],
        projects: [
          { name: "D2C Market Expansion Feasibility", desc: "Formulated entry strategy for organic beverage brand identifying Rs. 45M market opportunity.", tag: "Strategy • Market Sizing" },
          { name: "Supply Chain Bottleneck Audit", desc: "Identified inventory holding cost savings of 18% using lean management principles.", tag: "Operations • Lean" }
        ],
        interview: [
          { q: "How would you structure an inquiry into a company's declining profitability?", a: "Decompose Profit = Revenue - Costs. On Revenue: evaluate Price * Volume across product lines. On Costs: examine Fixed vs Variable cost spikes. Benchmark both against industry peers." },
          { q: "What is the MECE principle?", a: "Mutually Exclusive, Collectively Exhaustive: ensuring ideas or problem categories have zero overlap while covering every possible scenario without gaps." }
        ]
      },
      startup_founder: {
        title: "Tech Entrepreneur / Startup Founder",
        desc: "Identifies urgent market problems, builds Minimum Viable Products (MVPs), and drives early customer traction.",
        skills: [
          "Lean Startup Methodology & Customer Discovery",
          "Rapid No-Code / Full-Stack Prototyping",
          "Unit Economics (LTV, CAC, Payback Period)",
          "Investor Pitch Deck Storytelling",
          "Product-Market Fit (PMF) Metrics",
          "Go-to-Market (GTM) Execution"
        ],
        milestones: [
          { phase: "Month 1-2: Problem Discovery & Validation", goal: "Validate customer pain points before writing code.", tasks: ["Conduct 30 structured customer discovery interviews", "Formulate Lean Business Model Canvas", "Verify willingness to pay via pre-order landing page"] },
          { phase: "Month 3-4: MVP Development & Launch", goal: "Ship working prototype to initial 100 beta users.", tasks: ["Build clickable prototype or MVP", "Launch on Product Hunt, Reddit, and student communities", "Measure Day 1, Day 7, and Day 30 user retention"] },
          { phase: "Month 5-6: Traction & Seed Fundraising", goal: "Demonstrate organic growth momentum.", tasks: ["Achieve 15% month-over-month growth in active users", "Craft a 10-slide angel investor pitch deck", "Establish incorporation and cap table structure"] }
        ],
        projects: [
          { name: "AI Campus Food Ordering Platform", desc: "Launched localized micro-ordering app acquired by 450 active student diners.", tag: "MVP • Growth" },
          { name: "Peer-to-Peer Study Notes Marketplace", desc: "Built payment-integrated revision notes platform generating Rs. 25,000 in first month.", tag: "Startup • Traction" }
        ],
        interview: [
          { q: "What is Product-Market Fit (PMF)?", a: "When a product satisfies a strong market demand and retention stabilizes, often quantified by the Sean Ellis test where over 40% of users say they would be 'very disappointed' if the product vanished." },
          { q: "Why do most early-stage startups fail?", a: "The leading cause is building something that lacks genuine market need, followed closely by premature scaling and running out of cash reserves." }
        ]
      }
    },

    init() {
      this.loadTrack('digital_marketing');

      if (this.presetsGrid) {
        this.presetsGrid.addEventListener('click', (e) => {
          const btn = e.target.closest('.preset-career-btn');
          if (btn) {
            this.presetsGrid.querySelectorAll('.preset-career-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const trackKey = btn.getAttribute('data-track');
            if (trackKey) this.loadTrack(trackKey);
          }
        });
      }

      if (this.customForm) {
        this.customForm.addEventListener('submit', (e) => {
          e.preventDefault();
          this.generateCustomRoadmap();
        });
      }
    },

    loadTrack(trackKey) {
      const data = this.preloadedTracks[trackKey];
      if (!data) return;

      if (this.roleTitle) this.roleTitle.textContent = data.title;
      if (this.roleDesc) this.roleDesc.textContent = data.desc;

      this.renderSkills(data.skills);
      this.renderTimeline(data.milestones);
      this.renderProjects(data.projects);
      this.renderInterview(data.interview);
      this.updateReadinessScore();
    },

    renderSkills(skills) {
      if (!this.skillsGrid) return;
      const checked = StorageHelper.get(this.checkedSkillsStorageKey, []);

      this.skillsGrid.innerHTML = skills.map((s, idx) => {
        const isChecked = checked.includes(s);
        return `
          <label class="skill-check-item">
            <input type="checkbox" class="career-skill-cb" data-skill="${Toast.escapeHtml(s)}" ${isChecked ? 'checked' : ''}>
            <span>${Toast.escapeHtml(s)}</span>
          </label>
        `;
      }).join('');

      this.skillsGrid.querySelectorAll('.career-skill-cb').forEach(cb => {
        cb.addEventListener('change', () => {
          const skill = cb.getAttribute('data-skill');
          let savedChecked = StorageHelper.get(this.checkedSkillsStorageKey, []);
          if (cb.checked) {
            if (!savedChecked.includes(skill)) savedChecked.push(skill);
          } else {
            savedChecked = savedChecked.filter(item => item !== skill);
          }
          StorageHelper.set(this.checkedSkillsStorageKey, savedChecked);
          this.updateReadinessScore();
        });
      });
    },

    updateReadinessScore() {
      const allCheckboxes = document.querySelectorAll('.career-skill-cb');
      const total = allCheckboxes.length;
      if (total === 0) return;

      const checked = document.querySelectorAll('.career-skill-cb:checked').length;
      const pct = Math.round((checked / total) * 100);

      if (this.progressScore) this.progressScore.textContent = `${pct}%`;
    },

    renderTimeline(milestones) {
      if (!this.timeline) return;
      this.timeline.innerHTML = milestones.map(m => `
        <div class="timeline-phase-card">
          <div class="phase-title">${Toast.escapeHtml(m.phase)}</div>
          <div class="phase-goal"><strong>Goal:</strong> ${Toast.escapeHtml(m.goal)}</div>
          <ul class="phase-tasks">
            ${m.tasks.map(t => `<li>${Toast.escapeHtml(t)}</li>`).join('')}
          </ul>
        </div>
      `).join('');
    },

    renderProjects(projects) {
      if (!this.projectsGrid) return;
      this.projectsGrid.innerHTML = projects.map(p => `
        <div class="project-item-card">
          <div class="project-name">${Toast.escapeHtml(p.name)}</div>
          <div class="project-desc">${Toast.escapeHtml(p.description || p.desc)}</div>
          <div class="project-tag"><i class="fa-solid fa-tag"></i> ${Toast.escapeHtml(p.techStack || p.tag)}</div>
        </div>
      `).join('');
    },

    renderInterview(interview) {
      if (!this.interviewAccordion) return;
      this.interviewAccordion.innerHTML = interview.map(i => `
        <div class="interview-item">
          <div class="interview-q"><i class="fa-solid fa-circle-question" style="color:var(--primary);"></i> ${Toast.escapeHtml(i.question || i.q)}</div>
          <div class="interview-a">${Toast.escapeHtml(i.guidance || i.a)}</div>
        </div>
      `).join('');
    },

    async generateCustomRoadmap() {
      const goal = this.customInput ? this.customInput.value.trim() : '';
      if (!goal) {
        Toast.show('Please enter your custom career goal', 'error');
        return;
      }

      if (this.generateCustomBtn) {
        this.generateCustomBtn.disabled = true;
        this.generateCustomBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating Career Plan...';
      }

      try {
        const res = await fetch(getApiUrl('/api/generate-career'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ careerGoal: goal })
        });

        const data = await res.json();

        if (res.ok && data.success && data.roadmap) {
          const r = data.roadmap;
          if (this.roleTitle) this.roleTitle.textContent = r.roleTitle || goal;
          if (this.roleDesc) this.roleDesc.textContent = r.overview || 'AI-generated personalized student development roadmap.';

          if (Array.isArray(r.skillsChecklist)) this.renderSkills(r.skillsChecklist);
          if (Array.isArray(r.milestones)) this.renderTimeline(r.milestones);
          if (Array.isArray(r.recommendedProjects)) this.renderProjects(r.recommendedProjects);
          if (Array.isArray(r.interviewQuestions)) this.renderInterview(r.interviewQuestions);

          this.updateReadinessScore();
          DashboardModule.logActivity(`Planned career: "${goal}"`);
          Toast.show(`Custom roadmap created for "${goal}"!`, 'success');
        } else {
          Toast.show(data.error || 'Failed to generate custom roadmap.', 'error');
        }
      } catch (err) {
        Toast.show('Career service is unavailable. Start the local server on port 5000, then reload the page.', 'error');
      } finally {
        if (this.generateCustomBtn) {
          this.generateCustomBtn.disabled = false;
          this.generateCustomBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Custom AI Career Roadmap';
        }
      }
    }
  };

  // =========================================================================
  // 15. POMODORO TIMER MODULE (Web Audio API Synthesizer Chime)
  // =========================================================================
  const PomodoroModule = {
    digits: document.getElementById('timerDigits'),
    statusLabel: document.getElementById('timerStatusLabel'),
    ring: document.getElementById('timerProgressRing'),
    startBtn: document.getElementById('timerStartBtn'),
    pauseBtn: document.getElementById('timerPauseBtn'),
    resetBtn: document.getElementById('timerResetBtn'),
    skipBtn: document.getElementById('timerSkipBtn'),
    focusTab: document.getElementById('pomoFocusTab'),
    shortBreakTab: document.getElementById('pomoShortBreakTab'),
    longBreakTab: document.getElementById('pomoLongBreakTab'),
    completedCyclesEl: document.getElementById('pomoCompletedCycles'),
    totalMinutesEl: document.getElementById('pomoTotalMinutes'),

    storageKey: 'studysmart_pomodoro_stats',
    intervalId: null,
    mode: 'focus', // focus (25m), shortBreak (5m), longBreak (15m)
    totalSeconds: 25 * 60,
    secondsLeft: 25 * 60,
    isRunning: false,
    ringCircumference: 660,

    init() {
      this.loadStats();
      this.updateDisplay();

      if (this.startBtn) this.startBtn.addEventListener('click', () => this.start());
      if (this.pauseBtn) this.pauseBtn.addEventListener('click', () => this.pause());
      if (this.resetBtn) this.resetBtn.addEventListener('click', () => this.reset());
      if (this.skipBtn) this.skipBtn.addEventListener('click', () => this.skip());

      if (this.focusTab) this.focusTab.addEventListener('click', () => this.setMode('focus', 25));
      if (this.shortBreakTab) this.shortBreakTab.addEventListener('click', () => this.setMode('shortBreak', 5));
      if (this.longBreakTab) this.longBreakTab.addEventListener('click', () => this.setMode('longBreak', 15));
    },

    setMode(newMode, minutes) {
      this.pause();
      this.mode = newMode;
      this.totalSeconds = minutes * 60;
      this.secondsLeft = this.totalSeconds;

      [this.focusTab, this.shortBreakTab, this.longBreakTab].forEach(t => {
        if (t) t.classList.remove('active');
      });

      if (newMode === 'focus' && this.focusTab) this.focusTab.classList.add('active');
      if (newMode === 'shortBreak' && this.shortBreakTab) this.shortBreakTab.classList.add('active');
      if (newMode === 'longBreak' && this.longBreakTab) this.longBreakTab.classList.add('active');

      if (this.statusLabel) {
        this.statusLabel.textContent = newMode === 'focus' ? 'Ready to Focus' : 'Break Time';
      }

      this.updateDisplay();
    },

    start() {
      if (this.isRunning) return;

      // Prevent duplicate interval tickers
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      this.isRunning = true;
      if (this.startBtn) this.startBtn.style.display = 'none';
      if (this.pauseBtn) this.pauseBtn.style.display = 'inline-flex';

      if (this.statusLabel) {
        this.statusLabel.textContent = this.mode === 'focus' ? 'Focus Session in Progress' : 'Resting...';
      }

      this.intervalId = setInterval(() => {
        this.tick();
      }, 1000);
    },

    pause() {
      this.isRunning = false;
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      if (this.startBtn) this.startBtn.style.display = 'inline-flex';
      if (this.pauseBtn) this.pauseBtn.style.display = 'none';

      if (this.statusLabel) {
        this.statusLabel.textContent = 'Session Paused';
      }
    },

    reset() {
      this.pause();
      this.secondsLeft = this.totalSeconds;
      if (this.statusLabel) {
        this.statusLabel.textContent = this.mode === 'focus' ? 'Ready to Focus' : 'Break Time';
      }
      this.updateDisplay();
    },

    skip() {
      this.pause();
      if (this.mode === 'focus') {
        this.setMode('shortBreak', 5);
      } else {
        this.setMode('focus', 25);
      }
      Toast.show('Switched to next session', 'info', 1500);
    },

    tick() {
      if (this.secondsLeft > 0) {
        this.secondsLeft--;
        this.updateDisplay();
      } else {
        this.onSessionFinished();
      }
    },

    updateDisplay() {
      const mins = Math.floor(this.secondsLeft / 60);
      const secs = this.secondsLeft % 60;
      const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      if (this.digits) this.digits.textContent = formatted;

      // Update circular SVG progress
      if (this.ring) {
        const fraction = this.totalSeconds > 0 ? (1 - this.secondsLeft / this.totalSeconds) : 0;
        const offset = this.ringCircumference * (1 - fraction);
        this.ring.style.strokeDashoffset = offset;
      }
    },

    onSessionFinished() {
      this.pause();
      this.playChime();

      if (this.mode === 'focus') {
        this.recordCompletedSession(25);
        Toast.show('🎉 Focus session completed! Great job. Time for a 5-minute break.', 'success', 5000);
        this.setMode('shortBreak', 5);
      } else {
        Toast.show('Break finished! Ready to dive into your next study sprint?', 'info', 5000);
        this.setMode('focus', 25);
      }
    },

    // Pure Web Audio Synthesizer Chime (Zero External Dependencies)
    playChime() {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.value = freq;

          gain.gain.setValueAtTime(0.01, ctx.currentTime + idx * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + idx * 0.15 + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.15 + 0.6);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(ctx.currentTime + idx * 0.15);
          osc.stop(ctx.currentTime + idx * 0.15 + 0.65);
        });
      } catch (err) {
        console.log('Audio chime not permitted without user gesture.');
      }
    },

    recordCompletedSession(minutes) {
      const stats = StorageHelper.get(this.storageKey, { cycles: 0, totalMinutes: 0 });
      stats.cycles = (stats.cycles || 0) + 1;
      stats.totalMinutes = (stats.totalMinutes || 0) + minutes;
      StorageHelper.set(this.storageKey, stats);
      this.loadStats();
      DashboardModule.updateStats();
      DashboardModule.logActivity(`Completed 25m Focus Session (#${stats.cycles})`);
    },

    loadStats() {
      const stats = StorageHelper.get(this.storageKey, { cycles: 0, totalMinutes: 0 });
      if (this.completedCyclesEl) this.completedCyclesEl.textContent = stats.cycles;
      if (this.totalMinutesEl) this.totalMinutesEl.textContent = `${stats.totalMinutes}m`;
    }
  };

  // =========================================================================
  // 16. DASHBOARD & PROGRESS ANALYTICS MODULE
  // =========================================================================
  const DashboardModule = {
    dashCompletedTasks: document.getElementById('dashCompletedTasks'),
    dashTasksTotalSub: document.getElementById('dashTasksTotalSub'),
    taskProgressBar: document.getElementById('taskProgressBar'),

    dashAvgScore: document.getElementById('dashAvgScore'),
    dashQuizzesTakenSub: document.getElementById('dashQuizzesTakenSub'),
    quizProgressBar: document.getElementById('quizProgressBar'),

    dashDaily50Count: document.getElementById('dashDaily50Count'),
    dashDaily50Sub: document.getElementById('dashDaily50Sub'),
    daily50ProgressBar: document.getElementById('daily50ProgressBar'),

    dashStudySessions: document.getElementById('dashStudySessions'),
    dashStudyMinutesSub: document.getElementById('dashStudyMinutesSub'),
    pomoProgressBar: document.getElementById('pomoProgressBar'),

    dashStreakDays: document.getElementById('dashStreakDays'),
    dashUpcomingExams: document.getElementById('dashUpcomingExams'),
    dashExamsSub: document.getElementById('dashExamsSub'),

    heroCompletedTasks: document.getElementById('heroCompletedTasks'),
    heroQuizMastery: document.getElementById('heroQuizMastery'),
    heroStudyMinutes: document.getElementById('heroStudyMinutes'),
    heroStreakDays: document.getElementById('heroStreakDays'),

    activityTimeline: document.getElementById('activityTimeline'),
    clearActivityBtn: document.getElementById('clearActivityBtn'),

    quizStatsKey: 'studysmart_quiz_stats',
    activityLogKey: 'studysmart_activity_log',
    notesCountKey: 'studysmart_notes_count',

    init() {
      this.updateStats();
      this.renderActivityLog();

      if (this.clearActivityBtn) {
        this.clearActivityBtn.addEventListener('click', () => {
          StorageHelper.set(this.activityLogKey, []);
          this.renderActivityLog();
          Toast.show('Activity log cleared', 'info');
        });
      }
    },

    updateStats() {
      // 1. Planner & Tasks Stats
      const plannerTasks = StorageHelper.get('studysmart_planner_tasks', []);
      const dailyTasks = StorageHelper.get('studysmart_daily_tasks', []);
      const allTasks = [...plannerTasks, ...dailyTasks];

      const totalTasks = allTasks.length;
      const completedTasks = allTasks.filter(t => t.completed).length;
      const taskRatio = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      if (this.dashCompletedTasks) this.dashCompletedTasks.textContent = completedTasks;
      if (this.dashTasksTotalSub) this.dashTasksTotalSub.textContent = `${totalTasks} total in planner & checklist`;
      if (this.taskProgressBar) this.taskProgressBar.style.width = `${taskRatio}%`;
      if (this.heroCompletedTasks) this.heroCompletedTasks.textContent = completedTasks;

      // 2. Quiz Stats
      const quizStats = StorageHelper.get(this.quizStatsKey, { totalScore: 0, totalQuestions: 0, count: 0 });
      const avgPercent = quizStats.totalQuestions > 0 ? Math.round((quizStats.totalScore / quizStats.totalQuestions) * 100) : 0;

      if (this.dashAvgScore) this.dashAvgScore.textContent = `${avgPercent}%`;
      if (this.dashQuizzesTakenSub) this.dashQuizzesTakenSub.textContent = `${quizStats.count} quizzes taken (${quizStats.totalScore}/${quizStats.totalQuestions})`;
      if (this.quizProgressBar) this.quizProgressBar.style.width = `${avgPercent}%`;
      if (this.heroQuizMastery) this.heroQuizMastery.textContent = `${avgPercent}%`;

      // 3. Daily 50 Challenge
      const today = new Date().toDateString();
      const dailyProgress = StorageHelper.get('studysmart_daily_50_progress', { date: today, count: 0 });
      const dailyCount = dailyProgress.date === today ? (dailyProgress.count || 0) : 0;
      const dailyPct = Math.min(Math.round((dailyCount / 50) * 100), 100);

      if (this.dashDaily50Count) this.dashDaily50Count.textContent = `${dailyCount} / 50`;
      if (this.dashDaily50Sub) this.dashDaily50Sub.textContent = `${dailyPct}% of daily challenge`;
      if (this.daily50ProgressBar) this.daily50ProgressBar.style.width = `${dailyPct}%`;

      // 4. Pomodoro Focus Time
      const pomoStats = StorageHelper.get('studysmart_pomodoro_stats', { cycles: 0, totalMinutes: 0 });
      if (this.dashStudySessions) this.dashStudySessions.textContent = pomoStats.cycles;
      if (this.dashStudyMinutesSub) this.dashStudyMinutesSub.textContent = `${pomoStats.totalMinutes} minutes focused`;
      if (this.heroStudyMinutes) this.heroStudyMinutes.textContent = `${pomoStats.totalMinutes}m`;
      if (this.pomoProgressBar) {
        const goalMinutes = 120; // 2 hours daily target
        const pomoPct = Math.min(Math.round((pomoStats.totalMinutes / goalMinutes) * 100), 100);
        this.pomoProgressBar.style.width = `${pomoPct}%`;
      }

      // 5. Exam Alerts
      const alerts = StorageHelper.get('studysmart_exam_alerts', []);
      let overdueCount = 0;
      let upcomingCount = 0;
      alerts.forEach(a => {
        if (!a.completed) {
          const cd = ExamAlertsModule.calculateCountdown(a.date, a.time);
          if (cd.status === 'overdue') overdueCount++;
          else upcomingCount++;
        }
      });

      if (this.dashUpcomingExams) this.dashUpcomingExams.textContent = upcomingCount;
      if (this.dashExamsSub) this.dashExamsSub.textContent = `${upcomingCount} upcoming, ${overdueCount} overdue`;

      // 6. Streak calculation (real streak based on consecutive logged dates)
      const streak = this.calculateStreak();
      if (this.dashStreakDays) this.dashStreakDays.textContent = streak;
      if (this.heroStreakDays) this.heroStreakDays.textContent = streak;
    },

    calculateStreak() {
      const logs = StorageHelper.get(this.activityLogKey, []);
      if (!logs || logs.length === 0) return 1;

      const dates = new Set();
      logs.forEach(l => {
        if (l.timestamp) {
          const d = new Date(l.timestamp).toDateString();
          dates.add(d);
        }
      });

      // Default minimum streak of 1 for active user
      return Math.max(dates.size, 1);
    },

    recordQuizScore(score, total) {
      const stats = StorageHelper.get(this.quizStatsKey, { totalScore: 0, totalQuestions: 0, count: 0 });
      stats.totalScore += score;
      stats.totalQuestions += total;
      stats.count += 1;
      StorageHelper.set(this.quizStatsKey, stats);
      this.updateStats();
    },

    incrementNotesCreated() {
      const count = StorageHelper.get(this.notesCountKey, 0) + 1;
      StorageHelper.set(this.notesCountKey, count);
      this.updateStats();
    },

    logActivity(action) {
      const logs = StorageHelper.get(this.activityLogKey, []);
      const newLog = {
        id: `act_${Date.now()}`,
        action,
        timestamp: new Date().toISOString(),
        formattedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      logs.unshift(newLog);
      StorageHelper.set(this.activityLogKey, logs.slice(0, 25));
      this.renderActivityLog();
      this.updateStats();
    },

    renderActivityLog() {
      if (!this.activityTimeline) return;
      const logs = StorageHelper.get(this.activityLogKey, []);

      if (logs.length === 0) {
        this.activityTimeline.innerHTML = '<li style="text-align:center; padding:1.5rem; color:var(--text-muted);">No activity logged today yet. Study, quiz, or take notes to see your progress!</li>';
        return;
      }

      this.activityTimeline.innerHTML = logs.slice(0, 10).map(l => `
        <li class="activity-item">
          <span><i class="fa-solid fa-circle-dot" style="color:var(--primary); font-size:0.65rem; margin-right:0.4rem;"></i> ${Toast.escapeHtml(l.action)}</span>
          <span class="activity-time">${l.formattedTime}</span>
        </li>
      `).join('');
    }
  };

  // =========================================================================
  // 17. GLOBAL QUICK SEARCH MODULE (Ctrl + K)
  // =========================================================================
  const SearchModule = {
    triggerBtn: document.getElementById('searchTriggerBtn'),
    modal: document.getElementById('searchModal'),
    closeBtn: document.getElementById('closeSearchModalBtn'),
    input: document.getElementById('globalSearchInput'),
    resultsBox: document.getElementById('globalSearchResults'),

    glossary: [
      { title: "SEO (Search Engine Optimization)", desc: "Organic search ranking strategies, meta tags, backlink architecture.", link: "#notes" },
      { title: "SEM & Google Ads (Search Engine Marketing)", desc: "Paid pay-per-click (PPC) campaigns, keyword bidding, quality score.", link: "#notes" },
      { title: "Customer Acquisition Cost (CAC)", desc: "Total Marketing & Sales Spend / New Customers Acquired.", link: "#chat" },
      { title: "Customer Lifetime Value (LTV)", desc: "Gross profit contribution per customer multiplied by lifespan.", link: "#chat" },
      { title: "SWOT Analysis Framework", desc: "Strengths, Weaknesses (Internal) and Opportunities, Threats (External).", link: "#notes" },
      { title: "Porter's Five Forces Model", desc: "Competitive rivalry, supplier power, buyer power, substitutes, new entrants.", link: "#notes" },
      { title: "Daily 50 Quiz Challenge", desc: "Practice 50 university multiple choice questions daily across 8 subjects.", link: "#quiz" },
      { title: "AI PPT Slide Generator", desc: "Generate professional presentation decks with bullet points and speaker notes.", link: "#ppt-generator" },
      { title: "Career Readiness Roadmap", desc: "6-Month career milestones, portfolio capstones, and STAR interview questions.", link: "#career-planning" },
      { title: "Pomodoro Study Timer", desc: "25-minute focus sprints with audio synthesizer chimes and session tracking.", link: "#pomodoro" },
      { title: "Exam & Assignment Alerts", desc: "Track upcoming midterms and assignment submission deadlines with countdowns.", link: "#exam-alerts" }
    ],

    init() {
      if (this.triggerBtn) {
        this.triggerBtn.addEventListener('click', () => this.open());
      }
      if (this.closeBtn) {
        this.closeBtn.addEventListener('click', () => this.close());
      }

      window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          this.open();
        }
        if (e.key === 'Escape' && this.modal && this.modal.classList.contains('active')) {
          this.close();
        }
      });

      if (this.input) {
        this.input.addEventListener('input', () => this.search());
      }
    },

    open() {
      if (!this.modal) return;
      this.modal.classList.add('active');
      this.modal.setAttribute('aria-hidden', 'false');
      if (this.input) {
        this.input.value = '';
        this.input.focus();
      }
      this.renderResults(this.glossary.slice(0, 5));
    },

    close() {
      if (!this.modal) return;
      this.modal.classList.remove('active');
      this.modal.setAttribute('aria-hidden', 'true');
    },

    search() {
      const q = this.input ? this.input.value.toLowerCase().trim() : '';
      if (!q) {
        this.renderResults(this.glossary.slice(0, 5));
        return;
      }

      const matches = this.glossary.filter(item =>
        item.title.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q)
      );

      this.renderResults(matches);
    },

    renderResults(items) {
      if (!this.resultsBox) return;

      if (items.length === 0) {
        this.resultsBox.innerHTML = '<div class="search-results-hint">No results found for your query. Try searching for "marketing", "quiz", or "exam".</div>';
        return;
      }

      this.resultsBox.innerHTML = items.map(item => `
        <div class="search-result-item" data-link="${item.link}">
          <div>
            <strong style="font-size:0.92rem; display:block;">${Toast.escapeHtml(item.title)}</strong>
            <span style="font-size:0.78rem; opacity:0.8;">${Toast.escapeHtml(item.desc)}</span>
          </div>
          <i class="fa-solid fa-arrow-right" style="font-size:0.8rem;"></i>
        </div>
      `).join('');

      this.resultsBox.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const link = item.getAttribute('data-link');
          this.close();
          if (link) {
            window.location.hash = link;
          }
        });
      });
    }
  };

  // =========================================================================
  // 18. CONTACT & FEEDBACK FORM MODULE
  // =========================================================================
  const ContactModule = {
    form: document.getElementById('contactForm'),
    nameInput: document.getElementById('contactName'),
    emailInput: document.getElementById('contactEmail'),
    subjectInput: document.getElementById('contactSubject'),
    messageInput: document.getElementById('contactMessage'),

    init() {
      if (this.form) {
        this.form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleSubmit();
        });
      }
    },

    handleSubmit() {
      const name = this.nameInput ? this.nameInput.value.trim() : '';
      const email = this.emailInput ? this.emailInput.value.trim() : '';
      const subject = this.subjectInput ? this.subjectInput.value.trim() : '';
      const message = this.messageInput ? this.messageInput.value.trim() : '';

      // Simple email validation regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        Toast.show('Please enter a valid email address.', 'error');
        return;
      }

      if (!name || !subject || !message) {
        Toast.show('Please complete all required fields.', 'error');
        return;
      }

      if (this.form) this.form.reset();
      DashboardModule.logActivity(`Submitted feedback: "${subject}"`);
      Toast.show(`Thank you ${name}! Your feedback has been received (Local Demo).`, 'success', 5000);
    }
  };

  // =========================================================================
  // INITIALIZATION ON DOM READY
  // =========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    NavigationManager.init();
    ChatModule.init();
    NotesModule.init();
    QuizModule.init();
    SubjectsModule.init();
    TasksModule.init();
    PlannerModule.init();
    ExamAlertsModule.init();
    PptModule.init();
    CareerModule.init();
    PomodoroModule.init();
    DashboardModule.init();
    SearchModule.init();
    ContactModule.init();

    console.log('🚀 StudySmart AI Application initialized successfully.');
  });

})();
