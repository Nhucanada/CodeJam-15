import type { EnhancedChatMessage, AgentActionResponse, DrinkRecipeSchema } from '../types/cocktail';

interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

class ChatWebSocket {
private socket: WebSocket | null = null;
private onMessageCallback?: (message: EnhancedChatMessage) => void;
private reconnectAttempts = 0;
private maxReconnectAttempts = 5;
private chatHistory: ChatHistoryMessage[] = [];
private readonly HISTORY_STORAGE_KEY = 'chat_history';
private readonly MAX_HISTORY_SIZE = 50; // Store last 50 messages
private readonly HISTORY_TO_SEND = 10; // Send last 10 messages to backend

constructor() {
    this.loadHistory();
    this.connect();
}

  private connect() {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('No access token found');
      this.showChatError('No authentication token found. Please log in.');
      return;
    }

    const wsUrl = `ws://localhost:8000/api/v1/chat/ws?token=${token}`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.clearChatError(); // Clear any previous errors
    };

    this.socket.onmessage = (event) => {
      try {
        console.log('[WEBSOCKET] ========== Raw message received ==========');
        console.log('[WEBSOCKET] Raw event.data:', event.data);
        const message: EnhancedChatMessage = JSON.parse(event.data);
        console.log('[WEBSOCKET] Parsed message:', message);
        console.log('[WEBSOCKET] Message structure:', {
          type: message.type,
          hasMetadata: !!message.metadata,
          hasAgentAction: !!message.metadata?.agent_action,
          hasCreatedCocktail: !!message.metadata?.created_cocktail
        });
        this.handleMessage(message);
        if (this.onMessageCallback) {
          this.onMessageCallback(message);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        this.showChatError('Failed to parse server response');
      }
    };

    this.socket.onclose = (event) => {
      console.log('WebSocket disconnected', event.code, event.reason);

      if (event.code === 1006) {
        this.showChatError('🔌 Backend Not Running', 'The chat server needs to be started. Restart the backend and refresh the page.');
      } else if (event.code === 1008) {
        this.showChatError('🔐 Authentication Failed', 'Please log in again.');
      } else {
        this.showChatError('📡 Connection Lost', 'Attempting to reconnect...');
      }

      this.attemptReconnect();
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.showChatError('❌ Connection Error', 'Failed to connect to chat server');
    };
  }

  private showChatError(title: string, message?: string) {
    // Don't show WebSocket errors if login overlay is visible
    const loginOverlay = document.querySelector('.login-overlay') as HTMLElement;
    if (loginOverlay && loginOverlay.style.display === 'flex') {
      console.log('Suppressing WebSocket error while login overlay is visible:', title);
      return;
    }

    const chatMessages = document.querySelector('.chat-messages .message-container');
    if (!chatMessages) return;

    // Remove any existing error messages
    const existingErrors = chatMessages.querySelectorAll('.chat-error');
    existingErrors.forEach(error => error.remove());

    const errorDiv = document.createElement('div');
    errorDiv.className = 'message bot chat-error';
    errorDiv.style.cssText = `
      background: #ffebee;
      border-left: 4px solid #f44336;
      color: #c62828;
      padding: 12px;
      margin: 8px 0;
      border-radius: 4px;
    `;

    errorDiv.innerHTML = `
      <div style="font-weight: bold;">${title}</div>
      ${message ? `<div style="font-size: 0.9em; margin-top: 4px;">${message}</div>` : ''}
    `;

    chatMessages.appendChild(errorDiv);
    const chatContainer = document.querySelector('.chat-messages');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // If authentication failed, show login overlay
    if (title.includes('Authentication Failed') || title.includes('🔐 Authentication Failed')) {
      // Clear the access token
      localStorage.removeItem('access_token');

      // Show login overlay
      setTimeout(() => {
        const loginOverlay = document.querySelector('.login-overlay');
        if (loginOverlay) {
          (loginOverlay as HTMLElement).style.display = 'flex';
        }
      }, 1000); // Show login after 1 second delay
    }
  }

  private clearChatError() {
    const chatMessages = document.querySelector('.chat-messages .message-container');
    if (chatMessages) {
      const existingErrors = chatMessages.querySelectorAll('.chat-error');
      existingErrors.forEach(error => error.remove());
    }
  }

private handleMessage(message: EnhancedChatMessage) {
    console.log('[CHAT HANDLER] Received message:', message);
    console.log('[CHAT HANDLER] Message type:', message.type);
    console.log('[CHAT HANDLER] Has metadata:', !!message.metadata);
    console.log('[CHAT HANDLER] Has content:', !!message.content);
    console.log('[CHAT HANDLER] Content type:', typeof message.content);

    // Handle chat UI updates
    this.updateChatUI(message);

    // Check if content is an AgentActionResponse object (has action_type, conversation, etc.)
    const contentIsAgentAction = message.content &&
                                  typeof message.content === 'object' &&
                                  'action_type' in message.content &&
                                  'conversation' in message.content;

    console.log('[CHAT HANDLER] Content is agent action:', contentIsAgentAction);

    // Handle agent action from content field (primary method)
    if (contentIsAgentAction) {
        console.log('[CHAT HANDLER] Processing agent action from content:', message.content);
        this.handleAgentAction(message.content as AgentActionResponse);
    }
    // Handle agent action from metadata (fallback)
    else if (message.metadata?.agent_action) {
        console.log('[CHAT HANDLER] Processing agent_action from metadata:', message.metadata.agent_action);
        this.handleAgentAction(message.metadata.agent_action);
    } else {
        console.log('[CHAT HANDLER] No agent_action found in content or metadata');
    }

    // Handle legacy cocktail creation (backward compatibility)
    if (message.metadata?.created_cocktail) {
        console.log('[CHAT HANDLER] Processing legacy created_cocktail');
        this.handleCocktailCreated(message.metadata.created_cocktail);
    }
}

private handleAgentAction(action: AgentActionResponse) {
    console.log('[AGENT ACTION] Received action:', action);
    console.log('[AGENT ACTION] Action type:', action.action_type);
    console.log('[AGENT ACTION] Confidence:', action.confidence);
    console.log('[AGENT ACTION] Conversation:', action.conversation);
    console.log('[AGENT ACTION] Has drink_recipe:', !!action.drink_recipe);
    console.log('[AGENT ACTION] Has suggest_drink:', !!action.suggest_drink);

    // Handle different action types
    switch (action.action_type) {
        case 'create_drink':
            console.log('[AGENT ACTION] Routing to handleCreateDrink');
            if (action.drink_recipe) {
                console.log('[AGENT ACTION] drink_recipe data:', action.drink_recipe);
                this.handleCreateDrink(action.drink_recipe);
            } else {
                console.warn('[AGENT ACTION] create_drink action but no drink_recipe!');
            }
            break;
        case 'suggest_drink':
            console.log('[AGENT ACTION] Routing to handleSuggestDrink');
            if (action.suggest_drink) {
                console.log('[AGENT ACTION] suggest_drink data:', action.suggest_drink);
                this.handleSuggestDrink(action.suggest_drink);
            } else {
                console.warn('[AGENT ACTION] suggest_drink action but no suggest_drink!');
            }
            break;
        case 'search_drink':
            console.log('[AGENT ACTION] Routing to handleSearchDrink');
            if (action.drink_recipe) {
                console.log('[AGENT ACTION] drink_recipe data:', action.drink_recipe);
                this.handleSearchDrink(action.drink_recipe);
            } else {
                console.warn('[AGENT ACTION] search_drink action but no drink_recipe!');
            }
            break;
        default:
            console.warn('[AGENT ACTION] Unknown action type:', action.action_type);
    }
}

private handleCreateDrink(recipe: DrinkRecipeSchema) {
    console.log('[CREATE DRINK] Starting handleCreateDrink');
    console.log('[CREATE DRINK] Recipe:', recipe);
    console.log('[CREATE DRINK] Recipe name:', recipe.name);
    console.log('[CREATE DRINK] Ingredients:', recipe.ingredients);
    console.log('[CREATE DRINK] Glass type:', recipe.glass_type);
    console.log('[CREATE DRINK] Garnish:', recipe.garnish);
    console.log('[CREATE DRINK] Has ice:', recipe.has_ice);

    // Trigger 3D rendering
    if ((window as any).renderDrinkFromBackend) {
        console.log('[CREATE DRINK] Calling renderDrinkFromBackend');
        (window as any).renderDrinkFromBackend(recipe);
    } else {
        console.error('[CREATE DRINK] renderDrinkFromBackend not available on window!');
    }

    // Update recipe panel
    console.log('[CREATE DRINK] Updating recipe panel');
    this.updateRecipePanelFromBackend(recipe);

    // Refresh shelf panel if available
    if ((window as any).refreshShelfPanel) {
        console.log('[CREATE DRINK] Refreshing shelf panel');
        (window as any).refreshShelfPanel();
    }

    // Show success notification
    console.log('[CREATE DRINK] Showing notification');
    this.showNotification(`Created ${recipe.name}!`, 'success');
}

private handleSuggestDrink(recipe: DrinkRecipeSchema) {
    console.log('[SUGGEST DRINK] Starting handleSuggestDrink');
    console.log('[SUGGEST DRINK] Recipe:', recipe);
    console.log('[SUGGEST DRINK] Recipe name:', recipe.name);
    console.log('[SUGGEST DRINK] Ingredients:', recipe.ingredients);
    console.log('[SUGGEST DRINK] Glass type:', recipe.glass_type);
    console.log('[SUGGEST DRINK] Garnish:', recipe.garnish);
    console.log('[SUGGEST DRINK] Has ice:', recipe.has_ice);

    // Trigger 3D rendering to preview the suggestion
    if ((window as any).renderDrinkFromBackend) {
        console.log('[SUGGEST DRINK] Calling renderDrinkFromBackend');
        (window as any).renderDrinkFromBackend(recipe);
    } else {
        console.error('[SUGGEST DRINK] renderDrinkFromBackend not available on window!');
    }

    // Update recipe panel to show suggestion
    console.log('[SUGGEST DRINK] Updating recipe panel');
    this.updateRecipePanelFromBackend(recipe);

    // Show notification
    console.log('[SUGGEST DRINK] Showing notification');
    this.showNotification(`How about a ${recipe.name}?`, 'success');
}

private handleSearchDrink(recipe: DrinkRecipeSchema) {
    console.log('Search result:', recipe);

    // Trigger 3D rendering
    if ((window as any).renderDrinkFromBackend) {
        (window as any).renderDrinkFromBackend(recipe);
    }

    // Update recipe panel
    this.updateRecipePanelFromBackend(recipe);
}

private updateChatUI(message: EnhancedChatMessage) {
    console.log('[CHAT UI] Updating chat UI for message type:', message.type);
    const chatMessages = document.querySelector('.chat-messages .message-container');
    if (!chatMessages) {
        console.error('[CHAT UI] Chat messages container not found!');
        return;
    }

    if (message.type === 'stream_start') {
        // Create new bot message element
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot';
        messageDiv.id = `message-${message.message_id}`;
        messageDiv.textContent = 'Arthur: ';
        chatMessages.appendChild(messageDiv);
        console.log('[CHAT UI] Created stream_start message');
    } else if (message.type === 'stream_delta') {
        // Append to existing message
        const messageDiv = document.getElementById(`message-${message.message_id}`);
        if (messageDiv) {
            messageDiv.textContent += message.delta || '';
        }
    } else if (message.type === 'stream_end') {
        // Finalize message
        const messageDiv = document.getElementById(`message-${message.message_id}`);
        if (messageDiv && message.content) {
            // Extract text content
            const textContent = this.extractTextFromContent(message.content);

            // Check if content is AgentActionResponse object
            if (typeof message.content === 'object' && 'conversation' in message.content) {
                messageDiv.textContent = `Arthur: ${message.content.conversation}`;
                console.log('[CHAT UI] Set message from AgentActionResponse.conversation');
            } else {
                messageDiv.textContent = `Arthur: ${message.content}`;
                console.log('[CHAT UI] Set message from string content');
            }

            // Add to chat history
            if (textContent) {
                this.addToHistory('assistant', textContent);
            }
        }
    } else if (message.type === 'assistant') {
        // Handle assistant message (non-streaming)
        console.log('[CHAT UI] Handling assistant message');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot';
        messageDiv.id = `message-${message.message_id}`;

        // Extract text from content
        let messageText = '';
        if (message.content) {
            if (typeof message.content === 'object' && 'conversation' in message.content) {
                messageText = message.content.conversation;
                console.log('[CHAT UI] Extracted conversation from AgentActionResponse:', messageText);
            } else if (typeof message.content === 'string') {
                messageText = message.content;
                console.log('[CHAT UI] Using string content:', messageText);
            }
        }

        messageDiv.textContent = `Arthur: ${messageText}`;
        chatMessages.appendChild(messageDiv);
        console.log('[CHAT UI] Added assistant message to DOM');

        // Add to chat history
        if (messageText) {
            this.addToHistory('assistant', messageText);
        }
    }

    // Auto-scroll to bottom
    const chatContainer = document.querySelector('.chat-messages');
    if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

private handleCocktailCreated(cocktail: any) {
    console.log('Cocktail created via chat:', cocktail);

    // Refresh shelf panel if it's currently visible
    if ((window as any).refreshShelfPanel) {
    (window as any).refreshShelfPanel();
    }

    // Show success notification
    this.showNotification(`Created ${cocktail.name}!`, 'success');

    // Update the recipe panel with new cocktail details
    this.updateRecipePanel(cocktail);
}

private updateRecipePanelFromBackend(recipe: DrinkRecipeSchema) {
    console.log('[RECIPE PANEL] Starting updateRecipePanelFromBackend');
    console.log('[RECIPE PANEL] Recipe:', recipe);

    // Update ingredients
    const ingredientsBox = document.querySelector('.ingredients-box .message-container');
    console.log('[RECIPE PANEL] ingredientsBox element:', ingredientsBox);
    if (ingredientsBox) {
        ingredientsBox.innerHTML = '';
        console.log('[RECIPE PANEL] Adding', recipe.ingredients.length, 'ingredients');
        recipe.ingredients.forEach((ing, index) => {
            console.log(`[RECIPE PANEL] Ingredient ${index + 1}:`, ing);
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message bot';
            messageDiv.textContent = `${index + 1}. ${ing.amount} ${ing.unit} ${ing.name}`;
            ingredientsBox.appendChild(messageDiv);
        });
        console.log('[RECIPE PANEL] Ingredients added to DOM');
    } else {
        console.error('[RECIPE PANEL] ingredientsBox element not found!');
    }

    // Update recipe with instructions
    const recipeBox = document.querySelector('.recipe-box .message-container');
    console.log('[RECIPE PANEL] recipeBox element:', recipeBox);
    if (recipeBox) {
        recipeBox.innerHTML = '';

        // Add description
        if (recipe.description) {
            console.log('[RECIPE PANEL] Adding description:', recipe.description);
            const descDiv = document.createElement('div');
            descDiv.className = 'message bot';
            descDiv.textContent = recipe.description;
            descDiv.style.fontStyle = 'italic';
            descDiv.style.marginBottom = '10px';
            recipeBox.appendChild(descDiv);
        }

        // Add instructions
        console.log('[RECIPE PANEL] Adding', recipe.instructions.length, 'instructions');
        recipe.instructions.forEach((instruction, index) => {
            console.log(`[RECIPE PANEL] Instruction ${index + 1}:`, instruction);
            const instrDiv = document.createElement('div');
            instrDiv.className = 'message bot';
            instrDiv.textContent = `${index + 1}. ${instruction}`;
            recipeBox.appendChild(instrDiv);
        });
        console.log('[RECIPE PANEL] Instructions added to DOM');

        // Add glass type and garnish info
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'message bot';
        detailsDiv.style.marginTop = '10px';
        detailsDiv.style.fontSize = '0.9em';
        detailsDiv.style.color = '#666';
        const glassInfo = recipe.glass_type ? `Glass: ${recipe.glass_type}` : '';
        const garnishInfo = recipe.garnish ? `Garnish: ${recipe.garnish}` : '';
        const iceInfo = recipe.has_ice === false ? 'No ice' : '';
        const details = [glassInfo, garnishInfo, iceInfo].filter(d => d).join(' | ');
        if (details) {
            detailsDiv.textContent = details;
            recipeBox.appendChild(detailsDiv);
        }
    }

    // Switch to recipe view automatically
    const recipeButton = Array.from(document.querySelectorAll('.recipe-btn')).find(btn =>
        btn.textContent === 'RECIPE'
    ) as HTMLButtonElement;
    if (recipeButton) {
        recipeButton.click();
    }
}

private updateRecipePanel(cocktail: any) {
    // Update ingredients
    const ingredientsBox = document.querySelector('.ingredients-box .message-container');
    if (ingredientsBox) {
    ingredientsBox.innerHTML = '';
    cocktail.ingredients.forEach((ing: any, index: number) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot';
        messageDiv.textContent = `${index + 1}. ${ing.quantity} ${ing.unit} ${ing.name}`;
        ingredientsBox.appendChild(messageDiv);
    });
    }

    // Update recipe
    const recipeBox = document.querySelector('.recipe-box .message-container');
    if (recipeBox) {
    recipeBox.innerHTML = '';
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot';
    messageDiv.textContent = cocktail.recipe;
    recipeBox.appendChild(messageDiv);
    }

    // Switch to recipe view automatically
    const recipeButton = Array.from(document.querySelectorAll('.recipe-btn')).find(btn =>
    btn.textContent === 'RECIPE'
    ) as HTMLButtonElement;
    if (recipeButton) {
    recipeButton.click();
    }
}

private showNotification(message: string, type: 'success' | 'error' = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4CAF50' : '#f44336'};
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    z-index: 1000;
    font-family: Arial, sans-serif;
    `;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
    if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
    }
    }, 3000);
}

private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
    }
}

private loadHistory() {
    try {
        const saved = localStorage.getItem(this.HISTORY_STORAGE_KEY);
        if (saved) {
            this.chatHistory = JSON.parse(saved);
            console.log('[CHAT HISTORY] Loaded', this.chatHistory.length, 'messages from localStorage');
        } else {
            console.log('[CHAT HISTORY] No saved history found');
        }
    } catch (error) {
        console.error('[CHAT HISTORY] Failed to load history from localStorage:', error);
        this.chatHistory = [];
    }
}

private saveHistory() {
    try {
        // Keep only the last MAX_HISTORY_SIZE messages
        if (this.chatHistory.length > this.MAX_HISTORY_SIZE) {
            this.chatHistory = this.chatHistory.slice(-this.MAX_HISTORY_SIZE);
        }
        localStorage.setItem(this.HISTORY_STORAGE_KEY, JSON.stringify(this.chatHistory));
        console.log('[CHAT HISTORY] Saved', this.chatHistory.length, 'messages to localStorage');
    } catch (error) {
        console.error('[CHAT HISTORY] Failed to save history to localStorage:', error);
    }
}

private addToHistory(role: 'user' | 'assistant', content: string) {
    this.chatHistory.push({ role, content });
    this.saveHistory();
    console.log('[CHAT HISTORY] Added', role, 'message. Total messages:', this.chatHistory.length);
}

private extractTextFromContent(content: string | AgentActionResponse): string {
    if (typeof content === 'string') {
        return content;
    } else if (content && typeof content === 'object' && 'conversation' in content) {
        return content.conversation;
    }
    return '';
}

public clearHistory() {
    this.chatHistory = [];
    localStorage.removeItem(this.HISTORY_STORAGE_KEY);
    console.log('[CHAT HISTORY] History cleared');
}

public reconnect() {
    console.log('Manually reconnecting WebSocket...');
    this.disconnect();
    // Small delay before reconnecting to ensure cleanup is complete
    setTimeout(() => {
        this.connect();
    }, 500);
}

public sendMessage(content: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        // Add user message to history
        this.addToHistory('user', content);

        // Get last N messages to send as context (excluding the current message we just added)
        const recentHistory = this.chatHistory.slice(0, -1);

        console.log('[SEND MESSAGE] Sending message with', recentHistory.length, 'history messages');

        // Format history as a single content string
        let formattedContent = '';
        if (recentHistory.length > 0) {
            const historyString = recentHistory
                .map(msg => `[${msg.role.toUpperCase()}]: ${msg.content}`)
                .join('\n');
            formattedContent = `${historyString}\n\n[USER]: ${content}`;
        } else {
            formattedContent = content;
        }

        console.log('[SEND MESSAGE] Formatted content:', formattedContent);

        this.socket.send(JSON.stringify({
            type: 'user',
            content: formattedContent
        }));
    }
}

public onMessage(callback: (message: EnhancedChatMessage) => void) {
    this.onMessageCallback = callback;
}

public disconnect() {
    if (this.socket) {
    this.socket.close();
    this.socket = null;
    }
}
}

export const chatWebSocket = new ChatWebSocket();