import type { EnhancedChatMessage } from '../types/cocktail';

class ChatWebSocket {
private socket: WebSocket | null = null;
private onMessageCallback?: (message: EnhancedChatMessage) => void;
private reconnectAttempts = 0;
private maxReconnectAttempts = 5;

constructor() {
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
        const message: EnhancedChatMessage = JSON.parse(event.data);
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
        this.showChatError('🔌 Backend Not Running', 'The chat server needs to be started. Run: npm run dev in the backend folder');
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
    // Handle chat UI updates
    this.updateChatUI(message);

    // Handle cocktail creation
    if (message.metadata?.created_cocktail) {
    this.handleCocktailCreated(message.metadata.created_cocktail);
    }
}

private updateChatUI(message: EnhancedChatMessage) {
    const chatMessages = document.querySelector('.chat-messages .message-container');
    if (!chatMessages) return;

    if (message.type === 'stream_start') {
    // Create new bot message element
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot';
    messageDiv.id = `message-${message.message_id}`;
    messageDiv.textContent = 'Arthur: ';
    chatMessages.appendChild(messageDiv);
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
        messageDiv.textContent = `Arthur: ${message.content}`;
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
    this.socket.send(JSON.stringify({
        type: 'user',
        content: content
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