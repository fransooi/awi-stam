/** --------------------------------------------------------------------------  
*   ______ _______ _______ _______   _ 
*  / _____|_______|_______|_______) | |   
* ( (____     _    _______ _  _  _  | |
*  \____ \   | |  |  ___  | ||_|| | |_|
*  _____) )  | |  | |   | | |   | |  _
* (______/   |_|  |_|   |_|_|   |_| |_|   The Multi-Editor
*
* This file is open-source under the conditions contained in the
* license file located at the root of this project.
*
* ----------------------------------------------------------------------------
* @file SocketSideWindow.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Socket side window implementation
*/
import { SERVERCOMMANDS } from '../../../../engine/servercommands.mjs';
import { MENUCOMMANDS } from '../MenuBar.js';
import { MESSAGESCOMMANDS } from '../MessageManager.js';
import { Dialog } from '../../utils/Dialog.js';
import SideWindow from './SideWindow.js';
import WebSocketClient from '../../utils/WebSocketClient.js';

// Define message types for preference handling
export const SOCKETMESSAGES = {
  CONNECT: 'SOCKET_CONNECT',
  CONNECT_IF_CONNECTED: 'SOCKET_CONNECT_IF_CONNECTED',
  DISCONNECT: 'SOCKET_DISCONNECT',
  CONNECTED: 'SOCKET_CONNECTED',
  CONNECTEDAWI: 'SOCKET_CONNECTED_AWI',
  SEND_MESSAGE: 'SOCKET_SEND_MESSAGE',
  REQUEST_RESPONSE: 'SOCKET_REQUEST_RESPONSE',
  CONTENT_HEIGHT_CHANGED: 'CONTENT_HEIGHT_CHANGED',
  DISCONNECTED: 'SOCKET_DISCONNECTED',
  MESSAGE_RECEIVED: 'SOCKET_MESSAGE_RECEIVED',
  GET_CONNECTION_INFO: 'SOCKET_GET_CONNECTION_INFO',
  SHOW_CONNECTION_DIALOG: 'SOCKET_SHOW_CONNECTION_DIALOG',
  FROM_PROMPT: 'SOCKET_FROM_PROMPT',
  ENSURE_CONNECTED: 'SOCKET_ENSURE_CONNECTED'
};

class SocketSideWindow extends SideWindow {
  /**
   * Create a new SocketSideWindow
   * @param {number} initialHeight - Initial height of the window
   */
  constructor(parentId, containerId, initialHeight = 200) {
    super('Socket', 'Server', parentId, containerId, initialHeight);
    
    this.isConnected = false;
    this.isConnecting = false;
    this.wasConnected = false;
    this.isLoggedIn = false;
    this.isLoggedInAwi = false;
    this.messages = [];
    this.maxMessages = 50; // Maximum number of messages to display
    this.accountInfo = 
    {
      userName: '',
      firstName: '',
      lastName: '',
      password: '',
      email: '',
      language: 'en',
      countryCode: '',
      key: '',
      url: this.root.webSocketUrl,
      connectToAwi: false
    };
    
    // Message counters
    this.messagesSent = 0;
    this.messagesReceived = 0;
    
    // UI elements
    this.statusElement = null;
    this.messageContainer = null;
    this.connectButton = null;
    this.disconnectButton = null;
    this.userNameInput = null;
    this.urlInput = null;
    
    // Indicator elements
    this.connectionIndicator = null;
    this.sendIndicator = null;
    this.receiveIndicator = null;
    
    // Indicator timers
    this.sendFlashTimer = null;
    this.receiveFlashTimer = null;

    // Message handlers
    this.messageMap[SOCKETMESSAGES.CONNECT] = this.handleConnect;
    this.messageMap[SOCKETMESSAGES.CONNECT_IF_CONNECTED] = this.handleConnectIfConnected;
    this.messageMap[SOCKETMESSAGES.DISCONNECT] = this.handleLogout;
    this.messageMap[MENUCOMMANDS.LOGIN] = this.handleConnect;
    this.messageMap[MENUCOMMANDS.LOGOUT] = this.handleLogout;
    this.messageMap[SOCKETMESSAGES.SEND_MESSAGE] = this.handleSendMessage;
    this.messageMap[SOCKETMESSAGES.REQUEST_RESPONSE] = this.handleRequestResponse;
    this.messageMap[SOCKETMESSAGES.CONTENT_HEIGHT_CHANGED] = this.handleContentHeightChanged;    
    this.messageMap[SOCKETMESSAGES.GET_CONNECTION_INFO] = this.handleGetConnectionInfo;
    this.messageMap[SOCKETMESSAGES.ENSURE_CONNECTED] = this.handleEnsureConnected;

    // Create client if not exists
    this.client = new WebSocketClient({   
      root: this.root,
      onOpen: () => this.handleConnectionOpen(),
      onConnected: () => this.handleConnectionConnected(),
      onClose: () => this.handleConnectionClose(),
      onMessage: (message) => this.handleServerMessage(message),
      onError: (error) => this.handleConnectionError(error)
    });

    // Poke in root
    this.root.socket = this;
  }
  
  /**
   * Initialize the Socket side window
   * @param {Object} options - Optional configuration options
   * @returns {Promise<void>}
   */
  async init(options) {
    super.init(options);
    
    // Get timezone information
    this.countryList = await this.sendRequestTo('class:MessageManager', MESSAGESCOMMANDS.GET_COUNTRY_LIST);
    this.timezoneInformation = await this.sendRequestTo('class:MessageManager', MESSAGESCOMMANDS.GET_TIMEZONE_INFORMATION);
  }
  
  /**
   * Destroy the Socket side window
   * @returns {Promise<void>}
   */
  async destroy() {
    super.destroy();
  }
  
  
  /**
   * Override render to set up content and event listeners
   * @returns {HTMLElement} - The rendered window element
   */
  async render(containerId) {
    await super.render(containerId);
    
    // Add indicator buttons to the title bar
    this.addIndicatorButtons();
    
    // Create the socket UI
    this.createSocketUI();
       
    return this.container;
  }
  
  /**
   * Add indicator buttons to the title bar
   */
  addIndicatorButtons() {
    // Create container for indicators
    const indicatorContainer = document.createElement('div');
    indicatorContainer.className = 'socket-indicator-container';
    
    // Create connection indicator button
    this.connectionIndicator = document.createElement('span');
    this.connectionIndicator.className = 'socket-indicator connection-indicator';
    this.connectionIndicator.title = this.root.messages.getMessage('stam:connection-status-disconnected');
    this.connectionIndicator.addEventListener('click', () => this.toggleConnection());
    
    // Create send indicator button
    this.sendIndicator = document.createElement('span');
    this.sendIndicator.className = 'socket-indicator send-indicator';
    this.sendIndicator.title = this.root.messages.getMessage('stam:send-indicator');
    
    // Create receive indicator button
    this.receiveIndicator = document.createElement('span');
    this.receiveIndicator.className = 'socket-indicator receive-indicator';
    this.receiveIndicator.title = this.root.messages.getMessage('stam:receive-indicator');
    
    // Add indicators to container
    indicatorContainer.appendChild(this.connectionIndicator);
    indicatorContainer.appendChild(this.sendIndicator);
    indicatorContainer.appendChild(this.receiveIndicator);
    
    // Add container to the title bar (using true to place it before all controls)
    this.addCustomTitleBarButton(indicatorContainer, true);
    
    // Add styles for indicators
    this.addIndicatorStyles();
  }
  
  /**
   * Add styles for the indicator buttons
   */
  addIndicatorStyles() {
    if (!document.getElementById('socket-indicator-styles')) {
      const style = document.createElement('style');
      style.id = 'socket-indicator-styles';
      style.textContent = `
        .socket-indicator-container {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          margin: 0;
          padding: 0;
        }
        
        .socket-indicator {
          display: inline-block;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          margin: 0 3px;
          cursor: pointer;
          border: 1px solid #666;
          position: relative;
          top: 0px;
        }
        
        .connection-indicator {
          background-color: #ff3333; /* Red for disconnected */
        }
        
        .connection-indicator.connecting {
          background-color: #ffaa33; /* Orange for connecting */
        }
        
        .connection-indicator.connected {
          background-color: #33cc33; /* Green for connected */
        }
        
        .send-indicator {
          background-color: #225522; /* Dark green when idle */
        }
        
        .send-indicator.active {
          background-color: #33ff33; /* Light green when sending */
        }
        
        .receive-indicator {
          background-color: #225522; /* Dark green when idle */
        }
        
        .receive-indicator.active {
          background-color: #33ff33; /* Light green when receiving */
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  /**
   * Toggle connection status
   */
  toggleConnection() {
    if (this.isConnected) {
      this.disconnect();
    } else {
      this.connect(this.accountInfo);
    }
  }
  
  /**
   * Update content height to fill available space in the parent container
   * @param {number} [height] - Optional explicit height, will be calculated if not provided
   * @param {HTMLElement} [wrapper] - Optional wrapper element, will use container if not provided
   * @returns {number} The calculated height
   */
  async updateContentHeight(height, wrapper = null) {
    // Get the base height from parent class
    const baseHeight = await super.updateContentHeight(height, wrapper);
    const container = wrapper || this.container;
    if (!container) return baseHeight;
    
    const contentElement = this.content;
    if (!contentElement) return baseHeight;
    
    const messageContainer = contentElement.querySelector('.socket-messages');
    
    if (this.enlarged) {
      // For enlarged state, let the content flow naturally
      contentElement.style.overflow = 'auto';
      contentElement.style.width = '100%';
      contentElement.style.boxSizing = 'border-box';
      
      if (messageContainer) {
        messageContainer.style.height = 'auto';
        messageContainer.style.maxHeight = 'none';
        messageContainer.style.overflowY = 'auto';
        messageContainer.style.flex = '1 1 auto';
      }
    } else {
      // For normal state, calculate the height for the message container
      contentElement.style.overflow = 'hidden'; // Prevent double scrollbars
      
      if (messageContainer) {
        try {
          // Get all fixed height elements that take up space
          const statusBar = contentElement.querySelector('.socket-status-container');
          const inputArea = contentElement.querySelector('.socket-button-row');
          
          // Calculate total height of fixed elements
          const fixedElementsHeight = [
            statusBar?.offsetHeight || 0,
            inputArea?.offsetHeight || 0
          ].reduce((sum, h) => sum + h, 0);
          
          // Add padding/margins (using getComputedStyle for accuracy)
          const style = window.getComputedStyle(contentElement);
          const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) || 0;
          const margins = parseFloat(style.marginTop) + parseFloat(style.marginBottom) || 0;
          const borders = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth) || 0;
          
          // Calculate available height for messages
          const messageHeight = Math.max(100, baseHeight - fixedElementsHeight - padding - margins - borders - 5);
          
          // Apply the calculated height
          messageContainer.style.height = `${messageHeight}px`;
          messageContainer.style.maxHeight = `${messageHeight}px`;
          messageContainer.style.overflowY = 'auto';
          
          // Force a reflow to ensure the layout is updated
          void messageContainer.offsetHeight;
          
        } catch (error) {
          console.error('Error updating message container height:', error);
          // Fallback to flex layout if calculation fails
          messageContainer.style.height = '100%';
          messageContainer.style.overflowY = 'auto';
        }
      }
    }
    
    // Ensure the content element itself fills its container
    contentElement.style.display = 'flex';
    contentElement.style.flexDirection = 'column';
    contentElement.style.height = '100%';
    contentElement.style.width = '100%';
    contentElement.style.boxSizing = 'border-box';
    
    // Ensure the container has proper width and height
    if (container) {
      container.style.width = '100%';
      container.style.height = '100%';
    }
    
    return baseHeight;
  }
  
  /**
   * Create the socket UI
   */
  createSocketUI() {
    // Clear existing content
    this.content.innerHTML = '';
    
    // Set the content container to use flex layout
    this.content.className = 'socket-content';
    
    // Create status container and element
    const statusContainer = document.createElement('div');
    statusContainer.className = 'socket-status-container';
    
    this.statusElement = document.createElement('div');
    this.statusElement.className = 'socket-status';
    this.updateStatusDisplay();
    
    // Add status element to container
    statusContainer.appendChild(this.statusElement);
    
    // Create message container (console-like)
    this.messageContainer = document.createElement('div');
    this.messageContainer.className = 'socket-messages';
    
    // No longer need login/logout buttons as they're in the menu bar
    
    // Add all elements to content
    this.content.appendChild(statusContainer);
    this.content.appendChild(this.messageContainer);
    
    // Add some basic styling
    this.addStyles();
    
    // Display existing messages
    this.displayMessages();
  }
  /**
   * Add styles for the socket UI
   */
  addStyles() {
    // Add styles if not already present
    if (!document.getElementById('socket-side-window-styles')) {
      const style = document.createElement('style');
      style.id = 'socket-side-window-styles';
      style.textContent = `
        /* Main content container with flex layout */
        .socket-content {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden; /* Prevent double scrollbars */
        }
        
        /* Status container styles - fixed at top */
        .socket-status-container {
          display: flex;
          align-items: center;
          padding: 3px;
          background-color: #222;
          border-bottom: 1px solid #444;
          flex-shrink: 0; /* Prevent status from shrinking */
        }
        
        .socket-status {
          flex: 1;
          font-weight: bold;
          font-size: 0.85em;
          text-align: center;
          color: #ddd;
        }
        
        .socket-status.connected {
          color: #4CAF50;
        }
        
        .socket-status.disconnected {
          color: #F44336;
        }
        
        .socket-status.connecting {
          color: #FFC107;
        }
        
        /* Connection indicator */
        .socket-connection-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #F44336;
          margin: 0 5px;
        }
        
        .socket-connection-indicator.connected {
          background-color: #4CAF50;
        }
        
        .socket-connection-indicator.connecting {
          background-color: #FFC107;
        }
        
        /* Button row */
        .socket-button-row {
          display: flex;
          justify-content: flex-end;
          padding: 3px;
          background-color: #222;
          border-top: 1px solid #444;
          flex-shrink: 0; /* Prevent button row from shrinking */
        }
        
        .socket-button {
          padding: 2px 8px;
          margin-left: 5px;
          background-color: #333;
          color: #ddd;
          border: 1px solid #555;
          border-radius: 2px;
          font-size: 0.8em;
          cursor: pointer;
        }
        
        .socket-button:hover {
          background-color: #444;
        }
        
        .socket-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Console-like message display - scrollable area */
        .socket-messages {
          flex: 1 1 auto;
          min-height: 0; /* Allows the flex item to shrink below its content size */
          padding: 3px;
          overflow-y: auto;
          overflow-x: hidden; /* Prevent horizontal scrollbar */
          background-color: #000;
          color: #fff;
          font-family: monospace;
          font-size: 0.85em;
          line-height: 1.2;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        
        .socket-message {
          margin-bottom: 1px;
          padding: 1px 2px;
          border-bottom: 1px solid #222;
        }
        
        .socket-message-time {
          font-size: 0.75em;
          color: #888;
          margin-right: 4px;
          display: inline-block;
        }
        
        .socket-message-content {
          word-break: break-word;
          display: inline;
        }
        
        .socket-message-content-container {
          display: block;
          padding-left: 2px;
        }
        
        .socket-message-line {
          word-break: break-word;
          white-space: pre-wrap;
        }
        
        .socket-message-continuation {
          padding-left: 15px;
          position: relative;
        }
        
        .socket-message-continuation:before {
          content: '│';
          position: absolute;
          left: 5px;
          color: #555;
        }
        
        .socket-message-direction {
          font-weight: bold;
          margin-right: 3px;
        }
        
        .socket-message-sent .socket-message-direction {
          color: #2196F3;
        }
        
        .socket-message-received .socket-message-direction {
          color: #4CAF50;
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  /**
   * Display all messages in the message container
   */
  displayMessages() {
    if (!this.messageContainer) return;
    
    // Clear existing messages
    this.messageContainer.innerHTML = '';
    
    // Add each message
    this.messages.forEach(message => {
      this.addMessageToDisplay(message);
    });
    
    // Scroll to bottom
    this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
  }
  
  /**
   * Add a message to the display
   * @param {Object} message - The message to add
   */
  addMessageToDisplay(message) {
    if (!this.messageContainer) return;
    
    // Check if the message contains line breaks
    const hasLineBreaks = message.content.includes('\n');
    
    // Create the message container
    const messageElement = document.createElement('div');
    messageElement.className = `socket-message socket-message-${message.direction}`;
    
    // Create timestamp element
    const timeElement = document.createElement('span');
    timeElement.className = 'socket-message-time';
    timeElement.textContent = message.time;
    
    // Create direction indicator
    const directionElement = document.createElement('span');
    directionElement.className = 'socket-message-direction';
    directionElement.textContent = message.direction === 'sent' ? '→' : '←';
    
    // Add timestamp and direction indicator
    messageElement.appendChild(timeElement);
    messageElement.appendChild(directionElement);
    
    if (hasLineBreaks) {
      // For multi-line messages, create a container for the content
      const contentContainer = document.createElement('div');
      contentContainer.className = 'socket-message-content-container';
      
      // Split the content by line breaks and add each line
      const lines = message.content.split('\n');
      
      lines.forEach((line, index) => {
        // Create a new line element
        const lineElement = document.createElement('div');
        lineElement.className = 'socket-message-line';
        
        // Add indentation for all lines except the first one
        if (index > 0) {
          lineElement.classList.add('socket-message-continuation');
        }
        
        lineElement.textContent = line;
        contentContainer.appendChild(lineElement);
      });
      
      messageElement.appendChild(contentContainer);
    } else {
      // For single-line messages, just add the text directly
      messageElement.appendChild(document.createTextNode(message.content));
    }
    
    this.messageContainer.appendChild(messageElement);
    
    // Scroll to bottom
    this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
  }
  
  /**
   * Add a message to the message list
   * @param {string} direction - Direction of the message ('sent' or 'received')
   * @param {string} data - Content of the message
   */
  addMessage(direction, data, text) {
    if ( typeof data === 'undefined' )
      return;

    // Create message object
    var content = '';
    if ( typeof data === 'string' )
      content = data;
    else 
    {
      if (direction == 'sent') 
      {
        content = data.command;
        if (data.parameters && data.parameters.action)
          content += '-' + data.parameters.action;
      }
      else if (direction == 'received')
      {
        if (data.responseTo)
          content = data.responseTo;
        else if (data.command)
          content = data.command;
        if (data.error)
          content += '\n' + this.root.messages.getMessage('stam:error') + ': ' + data.error;
      }
    }
    if (text)
      content += '\n' + text;

    const message = {
      direction,
      content,
      time: new Date().toLocaleTimeString()
    };
    
    // Add to messages array
    this.messages.push(message);
    
    // Limit number of messages
    if (this.messages.length > this.maxMessages) {
      this.messages.shift();
    }
    
    // Add to display
    this.addMessageToDisplay(message);
  }
  
  /**
   * Update the status display based on connection state
   */
  updateStatusDisplay() {
    if (!this.statusElement) return;
    
    if (this.isConnected) {
      this.statusElement.textContent = 'Connected';
      this.statusElement.classList.add('connected');
      this.statusElement.classList.remove('disconnected');
      
      if (this.connectButton) this.connectButton.disabled = true;
      if (this.disconnectButton) this.disconnectButton.disabled = false;
    } else if (this.isConnecting) {
      this.statusElement.textContent = 'Connecting...';
      this.statusElement.classList.add('connecting');
      this.statusElement.classList.remove('connected', 'disconnected');
      
      if (this.connectButton) this.connectButton.disabled = true;
      if (this.disconnectButton) this.disconnectButton.disabled = true;
    } else {
      this.statusElement.textContent = 'Disconnected';
      this.statusElement.classList.add('disconnected');
      this.statusElement.classList.remove('connected', 'connecting');
      
      if (this.connectButton) this.connectButton.disabled = false;
      if (this.disconnectButton) this.disconnectButton.disabled = true;
    }
  }
  
  /**
   * Update the connection indicator
   */
  updateConnectionIndicator() {
    if (!this.connectionIndicator) return;
    
    if (this.isConnected) {
      this.connectionIndicator.className = 'socket-indicator connection-indicator connected';
      this.connectionIndicator.title = this.root.messages.getMessage('stam:connection-status-connected');
    } else if (this.isConnecting) {
      this.connectionIndicator.className = 'socket-indicator connection-indicator connecting';
      this.connectionIndicator.title = this.root.messages.getMessage('stam:connection-status-connecting');
    } else {
      this.connectionIndicator.className = 'socket-indicator connection-indicator disconnected';
      this.connectionIndicator.title = this.root.messages.getMessage('stam:connection-status-disconnected');
    }
  }
  
  /**
   * Update the send indicator
   */
  updateSendIndicator() {
    if (!this.sendIndicator) return;
    
    // Add active class
    this.sendIndicator.classList.add('active');
    
    // Remove active class after a short delay
    clearTimeout(this.sendFlashTimer);
    this.sendFlashTimer = setTimeout(() => {
      this.sendIndicator.classList.remove('active');
    }, 300);
  }
  
  /**
   * Update the receive indicator
   */
  updateReceiveIndicator() {
    if (!this.receiveIndicator) return;
    
    // Add active class
    this.receiveIndicator.classList.add('active');
    
    // Remove active class after a short delay
    clearTimeout(this.receiveFlashTimer);
    this.receiveFlashTimer = setTimeout(() => {
      this.receiveIndicator.classList.remove('active');
    }, 300);
  }
  
  /**
   * Update the send indicator tooltip
   */
  updateSendIndicatorTooltip() {
    if (this.sendIndicator) {
      this.sendIndicator.title = `Send Indicator: ${this.messagesSent} message${this.messagesSent !== 1 ? 's' : ''} sent since connection`;
    }
  }
  
  /**
   * Update the receive indicator tooltip
   */
  updateReceiveIndicatorTooltip() {
    if (this.receiveIndicator) {
      this.receiveIndicator.title = `Receive Indicator: ${this.messagesReceived} message${this.messagesReceived !== 1 ? 's' : ''} received since connection`;
    }
  }
  
  /**
   * Override getLayoutInfo to include SocketSideWindow-specific information
   * @returns {Object} Layout information for this SocketSideWindow
   */
  async getLayoutInfo() {
    // Get base layout information from parent class
    const layoutInfo = await super.getLayoutInfo();
    
    // Add SocketSideWindow-specific information
    layoutInfo.accountInfo = this.accountInfo;
    layoutInfo.isConnected = this.isConnected;
    layoutInfo.isLoggedIn = this.isLoggedIn;
    layoutInfo.isLoggedInAwi = this.isLoggedInAwi;
        
    return layoutInfo;
  }

  /**
   * Override applyLayout to include SocketSideWindow-specific information
   * @param {Object} layoutInfo - Layout information for this SocketSideWindow
   * @returns {Object} Layout information for this SocketSideWindow
   */
  async applyLayout(layoutInfo) {
    // Call parent class applyLayout
    await super.applyLayout(layoutInfo);
    
    // Add SocketSideWindow-specific information
    this.accountInfo = layoutInfo.accountInfo || null;
    this.wasConnected = layoutInfo.isConnected || false;
    this.wasLoggedIn = layoutInfo.isLoggedIn || false;
    this.wasLoggedInAwi = layoutInfo.isLoggedInAwi || false;
    return layoutInfo;
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(accountInfo) {
    if (!accountInfo.url || !accountInfo.userName || !accountInfo.password)
    {
      this.addMessage('sent', 'Missing required connection information');
      return;
    }
    // Disconnect if already connected
    if ( this.client.getState() === 'connected' ) {
      this.client.disconnect();
      this.accountInfo=null;
    }

    // Add connection message
    this.isConnected = false;
    this.isConnecting = true;
    this.isLoggedIn = false;
    this.isLoggedInAwi = false;
    this.addMessage('sent', 'Connecting to server...');
    this.updateStatusDisplay();
    this.updateConnectionIndicator();
    this.root.alert.showAnimatedAlert('stam:connecting-to-server', { type: 'animation', animationName: 'connection', stepName: 'loop1'});
    await this.root.utilities.sleep(1000);
    var password = accountInfo.password;
    delete accountInfo.password;
    this.client.connect(accountInfo.url).then((answer) => {
      if (!answer.error)
      {
        this.addMessage('sent', 'Connected!');
        this.isConnected = true;
        this.isConnecting = false;
        this.handleConnectionOpen(accountInfo, password);
        return;
      }
      this.connected = false;
      this.isConnecting = false;
      this.addMessage('sent', 'Connection failed' + 'reason: ' + answer.error);
      this.updateStatusDisplay();
      this.updateConnectionIndicator();
      this.root.alert.showError('stam:connection-error');
    }).catch(error => {
      this.root.alert.closeAnimatedAlert();
      this.handleConnectionError(error);
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    if ( this.client.getState() === 'connected' ) {
      this.client.disconnect(false);
      this.addMessage('sent', 'Disconnecting from server...');
    }
  }

  
  ///////////////////////////////////////////////////////////////////////////////////////////////
  // WebSocket Client Methods
  ///////////////////////////////////////////////////////////////////////////////////////////////
  
  /**
   * Handle connection open event
   */
  async handleConnectionOpen(accountInfo, password) {
    this.messagesSent = 0;
    this.messagesReceived = 0;
    this.updateStatusDisplay();
    this.updateConnectionIndicator();
    this.updateSendIndicatorTooltip();
    this.updateReceiveIndicatorTooltip();
    this.addMessage('received', 'Connected to server');
    
    var answer = await this.handleRequestResponse({command:SERVERCOMMANDS.CONNECT, parameters: { accountInfo: accountInfo, password: password, debug: this.root.debug }});
    if (!answer.error) 
    {
      this.isLoggedIn = true;
      this.addMessage('received', 'Connected to server');
      this.broadcast(SOCKETMESSAGES.CONNECTED, { userName: answer.userName });
      if (answer.connectToAwi)
      {
        var response;
        if (accountInfo.createAccount)
        {
          this.root.alert.showAnimatedAlert('stam:creating-awi-account', {type: 'animation', animationName: 'connection', stepName: 'loop2' });    
          await this.root.utilities.sleep(2000);
          if (accountInfo.firstName)
            response = await this.handleRequestResponse({command:SERVERCOMMANDS.CREATE_AWI_ACCOUNT, parameters: { userName: answer.userName, accountInfo: accountInfo }});
          if (response.error){
            this.root.alert.showError('stam:failed-to-create-awi-account');
            this.addMessage('sent', 'Failed to create AWI account');
            this.disconnect();
            return; 
          }
        }
        this.root.alert.showAnimatedAlert('stam:logging-in-awi', {type: 'animation', animationName: 'connection', stepName: 'loop2' });
        response = await this.handleRequestResponse({command:SERVERCOMMANDS.LOGINAWI, parameters: { userName: answer.userName, key: answer.key }});
        await this.root.utilities.sleep(1000);
        if (!response.error) 
        {
          this.isLoggedInAwi = true;
          this.addMessage('received', 'Logged in AWI');
          this.root.alert.showAnimatedAlert('stam:awi-logged-in', { type: 'animation', animationName: 'connection', stepName: 'successAwi', timeout: 1000 } );          
          this.broadcast(SOCKETMESSAGES.CONNECTEDAWI, { userName: answer.userName });
        }
        else
        {
          this.addMessage('sent', 'Failed to login AWI');
          this.disconnect();          
          await this.root.alert.closeAnimatedAlert();
          await this.root.alert.showError('stam:failed-to-login-awi');          
        }
      }
      else
      {
        this.root.alert.showAnimatedAlert('stam:connection-success', { type: 'animation', animationName: 'connection', stepName: 'successServer', timeout: 1000 } );
      }
    }
    else
    {
      this.addMessage('sent', 'Failed to connect'); 
      if (answer.error === 'awi:account-not-found')
        await this.root.alert.showError('stam:account-not-found', { value: accountInfo.userName });
      else if (answer.error === 'awi:wrong-password')
      {
        var answer = await this.root.alert.showCustom('stam:wrong-password', this.root.messages.getMessage('stam:password-not-found', { value: accountInfo.userName }), ['stam:retry|positive', 'stam:change-password|negative'], 'error');
        if (answer === 1)
          await this.root.alert.showInformation('stam:mail-sent', { value: accountInfo.userName + '@toto.com' });
      }
      else
        await this.root.alert.showError(answer.error);
    }
  }
  
  /**
   * Handle connection close event
   */
  handleConnectionClose() {
    this.isConnected = false;
    this.isConnecting = false;
    this.isLoggedIn = false;
    this.isLoggedInAwi = false;
    this.updateStatusDisplay();
    this.updateConnectionIndicator();
    this.updateSendIndicatorTooltip();
    this.updateReceiveIndicatorTooltip();
    this.addMessage('received', 'Disconnected from server');
    this.broadcast(SOCKETMESSAGES.DISCONNECTED, { userName: this.accountInfo.userName });
  }
  
  /**
   * Handle connection error event
   * @param {Error} error - The error that occurred
   */
  handleConnectionError(error) {
    this.addMessage('received', `Error: ${error}`);
    this.updateStatusDisplay();
    this.updateConnectionIndicator();
    this.updateSendIndicatorTooltip();
    this.updateReceiveIndicatorTooltip();
  }
  
  /**
   * Handle message from server
   * @param {Object} message - The message received
   */
  async handleServerMessage(message) {
    // Increment received counter
    this.messagesReceived++;
    
    // Update receive indicator
    this.updateReceiveIndicator();
    this.updateReceiveIndicatorTooltip();

    // Connected?
    if (message.responseTo === SERVERCOMMANDS.CONNECT) 
    {
      this.addMessage('received', message);    
      if (!message.error) 
      {
        this.isLoggedIn = true;
        this.broadcast(SOCKETMESSAGES.CONNECTED, message.parameters);  
      }
    }
    else if (message.responseTo === SERVERCOMMANDS.LOGINAWI)
    {
      this.addMessage('received', message);    
      if (!message.error) 
      {
        this.isLoggedInAwi = true;
        this.addMessage('received', 'Logged in AWI');
        this.broadcast(SOCKETMESSAGES.CONNECTEDAWI, { userName: this.accountInfo.userName });
      }
    }
    else if (message.command === SERVERCOMMANDS.PROMPT) 
    {
      this.addMessage('received', message, message.parameters.text);    
    }
    else
    {
      this.addMessage('received', message);
    }
    this.sendMessageToRoot(SOCKETMESSAGES.MESSAGE_RECEIVED,message);
  }
  
  ///////////////////////////////////////////////////////////////////////////////////////////////
  // STAM Message Handlers
  ///////////////////////////////////////////////////////////////////////////////////////////////
    
  async handleConnect(data,sender) {
    if (this.isConnected)
      return;
    var accountInfo = data.accountInfo || this.accountInfo;
    if (!data || (data && !data.force))
    {
      var edited = false;
      do{
        var connect = await this.showConnectionDialog(accountInfo, edited);
        if (!connect)
          return false;
        accountInfo.userName = connect.userName;
        accountInfo.password = connect.password;
        if (connect.createAccount)
        {
          var response = await this.showCreateAccountDialog(accountInfo, true);
          if (response){
            accountInfo = response;
            accountInfo.createAccount = true;
            edited = true;
          }
          continue;
        }
        break;
      } while (true);
    }
    this.connect(accountInfo);
    return true;
  }
  
  /**
   * Handle SOCKET_CONNECT_IF_CONNECTED message
   * @param {Object} messageData - Message data
   * @returns {boolean} - True if handled
   */
  async handleConnectIfConnected(data,sender) {
    if (this.wasConnected && this.accountInfo) {
      await this.connect(this.accountInfo);
    } 
    return true;
  }
  
  /**
   * Handle SOCKET_LOGOUT message
   * @param {Object} messageData - Message data
   * @returns {boolean} - True if handled
   */
  async handleLogout(data,sender) {
    this.disconnect();
    return true;
  }

  /**
   * Handle SOCKET_GET_CONNECTION_INFO message
   * @param {Object} messageData - Message data
   * @returns {Object} - Connection information
   */
  async handleGetConnectionInfo(data,sender) {
    return {
      userName: this.accountInfo.userName,
      url: this.accountInfo.url,
      connected: this.isConnected,
      loggedIn: this.isLoggedIn,
      loggedInAWI: this.isLoggedInAwi
    };
  }

  /**
   * Handle SOCKET_ENSURE_CONNECTED message
   * @param {Object} messageData - Message data
   * @returns {boolean} - True if handled
   */
  async handleEnsureConnected(data,sender) {
    if (!this.isConnected) {
      await this.showConnectionDialog();
      return false;
    }
    return true;
  }


  /**
   * Handle SOCKET_SEND_MESSAGE message
   * @param {Object} messageData - Message data
   * @returns {boolean} - True if handled
   */
  async handleSendMessage(data,sender) {
    if (this.client && this.isConnected) {
      await this.client.send(data.command,data.parameters);

      // Increment sent counter
      this.messagesSent++;
      this.addMessage('sent', data);
      
      // Update send indicator
      this.updateSendIndicator();
      this.updateSendIndicatorTooltip();
      return true;
    }
    return false;
  }

  async handleRequestResponse(data,sender) {

    if (this.client && this.isConnected) {
      var self = this;

      // Increment sent counter
      this.messagesSent++;
      this.addMessage('sent', data);
      this.updateSendIndicator();
      this.updateSendIndicatorTooltip();

      return new Promise((resolve, reject) => {
        this.client.requestResponse(data.command,data.parameters)
        .then(data => {
          // Add response to display
          this.addMessage('received', data);
          
          // Update receive indicator
          this.updateReceiveIndicator();
          this.updateReceiveIndicatorTooltip();

          // Send response back to sender
          resolve(data.parameters);
        })
        .catch(data => {
          // Add error to display
          this.addMessage('received', data);
          
          // Update receive indicator
          this.updateReceiveIndicator();
          this.updateReceiveIndicatorTooltip();

          // Send error back to sender
          reject(data.error);
        });
      });
    }
    return false;
  }
  /**
   * Show a dialog to create a new account
   * @param {Array} userList - List of existing users (optional)
   * @returns {Promise<Object>} - Resolves to the account information
   */
  showCreateAccountDialog(accountInfo = {}, back = false) {
    accountInfo.connectToAwi = true;
    var theme = this.root.preferences.getCurrentTheme();    
    return new Promise((resolve) => {

      // Create form
      const form = document.createElement('form');
      form.style.display = 'flex';
      form.style.flexDirection = 'column';
      form.style.gap = '15px';
      
      // Helper function to create form groups
      const createFormGroup = (labelText, inputType, required = false, value = '', placeholder = '') => {
        const group = document.createElement('div');
        group.style.display = 'flex';
        group.style.flexDirection = 'column';
        group.style.gap = '5px';
        
        const label = document.createElement('label');
        label.textContent = labelText + (required ? ' *' : '');
        label.style.fontSize = '14px';
        group.appendChild(label);
        
        if (inputType == 'select')
        {
          const input = document.createElement('select');
          input.value = value;
          input.placeholder = placeholder;
          input.style.padding = '8px';
          input.style.backgroundColor = `var(--background-color)`;
          input.style.color = `var(--text-primary)`;
          input.style.border = '1px solid var(--borders)';
          input.style.borderRadius = '3px';
          input.style.fontSize = '14px';
          input.required = required;
          group.appendChild(input);
          return { group, input };
        }
        else
        {
          const input = document.createElement('input');
          input.type = inputType;
          input.value = value;
          input.placeholder = placeholder;
          input.style.padding = '8px';
          input.style.backgroundColor = `var(--background-color)`;
          input.style.color = `var(--text-primary)`;
          input.style.border = '1px solid var(--borders)';
          input.style.borderRadius = '3px';
          input.style.fontSize = '14px';
          input.required = required;
          group.appendChild(input);
          return { group, input };
        }        
      };

      // Create container for username and email fields
      const userInfoContainer = document.createElement('div');
      userInfoContainer.style.display = 'flex';
      userInfoContainer.style.gap = '10px';
      userInfoContainer.style.width = '100%';
      userInfoContainer.style.marginBottom = '0px';
      
      // Username field
      const { group: userNameGroup, input: userNameInput } = createFormGroup('User Name', 'text', true, accountInfo.userName);
      userNameGroup.style.flex = '1';
      userNameGroup.style.minWidth = '0';
      userNameInput.style.width = '100%';
      userInfoContainer.appendChild(userNameGroup);
      
      // Email field
      const { group: emailGroup, input: emailInput } = createFormGroup('Email', 'email', true, accountInfo.email);
      emailGroup.style.flex = '1';
      emailGroup.style.minWidth = '0';
      emailInput.style.width = '100%';
      userInfoContainer.appendChild(emailGroup);
      
      form.appendChild(userInfoContainer);
      
      // Password fields
      const { group: passwordGroup, input: passwordInput } = createFormGroup('Password', 'password', true, accountInfo.password);
      form.appendChild(passwordGroup);
      const { group: confirmPasswordGroup, input: confirmPasswordInput } = createFormGroup('Confirm Password', 'password', true, accountInfo.password);
      form.appendChild(confirmPasswordGroup);
      const passwordValidation = document.createElement('div');
      passwordValidation.style.fontSize = '12px';
      passwordValidation.style.color = '#ff6b6b';
      passwordValidation.style.marginTop = '-10px';
      passwordValidation.style.display = 'none';
      form.appendChild(passwordValidation);
      
      const languageGroup = document.createElement('div');
      languageGroup.style.display = 'flex';
      languageGroup.style.flexDirection = 'column';
      languageGroup.style.gap = '5px';      
      const languageLabel = document.createElement('label');
      languageLabel.textContent = this.root.messages.getMessage('stam:preferred-language');
      languageLabel.style.fontSize = '14px';
      languageGroup.appendChild(languageLabel);      
      const languageSelect = document.createElement('select');
      languageSelect.style.padding = '8px';
      languageSelect.style.backgroundColor = `var(--background-color)`;
      languageSelect.style.color = `var(--text-primary)`;
      languageSelect.style.border = '1px solid var(--borders)';
      languageSelect.style.borderRadius = '3px';
      languageSelect.style.fontSize = '14px';
      languageSelect.value = accountInfo.language;      
      const langs = ['en|English', 'fr|Francais', 'de|Deutsch'];
      langs.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.split('|')[0];
        option.textContent = lang.split('|')[1];
        languageSelect.appendChild(option);
      });      
      languageGroup.appendChild(languageSelect);
      form.appendChild(languageGroup);
      
      // Check box for 'Connect to AWI server'
      const connectToAwi = document.createElement('div');
      connectToAwi.style.display = 'flex';
      connectToAwi.style.alignItems = 'center';
      connectToAwi.style.gap = '8px';
      connectToAwi.style.marginBottom = '0px';      
      const connectToAwiCheckbox = document.createElement('input');
      connectToAwiCheckbox.type = 'checkbox';
      connectToAwiCheckbox.id = 'connect-to-awi-checkbox';
      connectToAwiCheckbox.checked = accountInfo.connectToAwi;
      connectToAwiCheckbox.style.margin = '0';
      connectToAwiCheckbox.style.cursor = 'pointer';      
      const connectToAwiLabel = document.createElement('label');
      connectToAwiLabel.htmlFor = 'connect-to-awi-checkbox';
      connectToAwiLabel.textContent = this.root.messages.getMessage('stam:connect-to-awi-server');
      connectToAwiLabel.style.fontSize = '14px';
      connectToAwiLabel.style.cursor = 'pointer';
      connectToAwiLabel.style.margin = '0';      
      connectToAwi.appendChild(connectToAwiCheckbox);
      connectToAwi.appendChild(connectToAwiLabel);
      form.appendChild(connectToAwi);
      
      // Create a container for the name fields to be displayed side by side
      const nameFieldsContainer = document.createElement('div');
      nameFieldsContainer.style.display = accountInfo.connectToAwi ? 'flex' : 'none';
      nameFieldsContainer.style.gap = '10px';
      nameFieldsContainer.style.width = '100%';
      nameFieldsContainer.style.marginBottom = '0px';
      const { group: firstNameGroup, input: firstNameInput } = createFormGroup('First Name', 'text', true, accountInfo.firstName);
      firstNameGroup.style.flex = '1';
      firstNameGroup.style.minWidth = '0';
      firstNameGroup.style.marginBottom = '0';
      firstNameInput.style.width = '100%';
      nameFieldsContainer.appendChild(firstNameGroup);
      const { group: lastNameGroup, input: lastNameInput } = createFormGroup('Last Name', 'text', true, accountInfo.lastName);
      lastNameGroup.style.flex = '1';
      lastNameGroup.style.minWidth = '0';
      lastNameGroup.style.marginBottom = '0';
      lastNameInput.style.width = '100%';
      nameFieldsContainer.appendChild(lastNameGroup);      
      form.appendChild(nameFieldsContainer);

      const { group: keyGroup, input: keyInput } = createFormGroup('Key', 'text', true, accountInfo.key);
      keyGroup.style.display = accountInfo.connectToAwi ? 'flex' : 'none';
      form.appendChild(keyGroup);

      // Create a combo box with all countries filled with this.countryList and set the default to the current country
      const { group: countryGroup, input: countryInput } = createFormGroup('Country', 'select', true, accountInfo.countryCode);
      countryGroup.style.flex = '1';
      countryGroup.style.minWidth = '0';
      countryGroup.style.marginBottom = '0';
      countryInput.style.width = '100%';
      countryGroup.style.display = accountInfo.connectToAwi ? 'flex' : 'none';
      for (var cc in this.countryList)
      {
        const option = document.createElement('option');
        option.value = cc;
        option.textContent = this.countryList[cc].name;
        countryInput.appendChild(option);
      }
      if (accountInfo.countryCode)
        countryInput.value = accountInfo.countryCode;
      else
        countryInput.value = this.timezoneInformation.countryCode;
      form.appendChild(countryGroup);

      // Show/hide the rest of the form based on the checkbox
      connectToAwiCheckbox.addEventListener('change', () => {
        if (connectToAwiCheckbox.checked) {
          nameFieldsContainer.style.display = 'flex';
          keyGroup.style.display = 'flex';
          countryGroup.style.display = 'flex';
        } else {
          nameFieldsContainer.style.display = 'none';
          keyGroup.style.display = 'none';
          countryGroup.style.display = 'none';
        }
      });

      // Create dialog 
      let dialog = null;
      let dialogAnswer = null;
      const buttons = [
        {
          label: this.root.messages.getMessage('stam:cancel'),
          className: 'btn-neutral',
          onClick: () => {
            dialogAnswer = null;
            dialog.close();
          }
        },
        {
          label: this.root.messages.getMessage(back ? 'stam:back' : 'stam:save'),
          className: 'btn-positive',
          onClick: () => {
            // Validate form
            var test = {
              userName: userNameInput.value.trim(),
              firstName: firstNameInput.value.trim(),
              lastName: lastNameInput.value.trim(),
              password: passwordInput.value,
              email: emailInput.value.trim(),
              language: languageSelect.value,
              countryCode: countryInput.value,
              connectToAwi: connectToAwiCheckbox.checked,
              key: keyInput.value.trim() || '',
              url: accountInfo.url
            };

            let errorMessage = '';
            if (!test.userName.trim()) {
              errorMessage = 'stam:user-name-required';
            } else if (!test.userName.trim().match(/^[a-zA-Z0-9_]+$/)) {
              errorMessage = 'stam:user-name-illegal-chars';
            } else if (!test.email.trim()) {
              errorMessage = 'stam:email-required';
            } else if (!test.email.includes('@') || !test.email.includes('.')) {
              errorMessage = 'stam:email-invalid';
            } else if (!test.password || test.password.length < 8) {
              errorMessage = 'stam:password-invalid';
            } else if (test.password !== confirmPasswordInput.value) {
              errorMessage = 'stam:passwords-do-not-match';
            } else if (connectToAwiCheckbox.checked) {
              if (!firstNameInput.value.trim()) {
                errorMessage = 'stam:first-name-required';
              }
              if (!keyInput.value.trim()) {
                errorMessage = 'stam:key-required';
              }
            }
            if (errorMessage) {
              this.root.alert.showError(this.root.messages.getMessage(errorMessage));
              return;
            }
            // Create account info object - username will be added from the connection dialog
            dialogAnswer = test;
            dialog.close();
          }
        },
      ];

      // Create and show the dialog
      dialog = new Dialog({
        title: this.root.messages.getMessage('stam:create-account-dialog'),
        content: form,
        buttons: buttons,
        theme: theme,
        className: 'socket-create-account-dialog',
        onOpen: () => {
          // Focus on username input when dialog opens
          userNameInput.focus();
        },
        onClose: () => {
          // If dialog is closed without clicking any button, treat as cancel
          resolve(dialogAnswer);
        }
      });      
      dialog.open();

      confirmPasswordInput.addEventListener('input', () => {
        if (passwordInput.value !== confirmPasswordInput.value) {
          passwordValidation.textContent = 'Passwords do not match';
          passwordValidation.style.display = 'block';
          confirmPasswordInput.style.borderColor = '#ff6b6b';
          dialog.buttons[1].element.disabled = true;
        } else {
          passwordValidation.style.display = 'none';
          confirmPasswordInput.style.borderColor = '#555';
          dialog.buttons[1].element.disabled = false;
        }
      });      
    });
  }

  /**
   * Show a connection dialog to enter user credentials and server URL
   * @returns {Promise<{userName: string, url: string, isAwiAccountChecked: boolean}|false>} - Resolves with connection data or false if canceled
   */
  showConnectionDialog(accountInfo = {}, edited = false) {
    return new Promise((resolve) => {
      // Create form container
      const form = document.createElement('form');
      form.style.display = 'flex';
      form.style.flexDirection = 'column';
      
      // Create username field
      const userNameGroup = document.createElement('div');
      userNameGroup.className = 'form-group';
      userNameGroup.innerHTML = `
        <label for="language-select">${this.root.messages.getMessage('stam:username')}</label>
        <input type="text" id="username" name="username" value="${accountInfo.userName || ''}">
      `;
      form.appendChild(userNameGroup);
        
      // Password field with reveal toggle
      const passwordGroup = document.createElement('div');
      passwordGroup.className = 'form-group';
      passwordGroup.innerHTML = `
        <label for="password">${this.root.messages.getMessage('stam:password')}</label>
        <input type="password" id="password" name="password" value="${accountInfo.password || ''}">
        <button type="button" id="reveal-password" class="btn btn-link">
          <i class="fas fa-eye"></i>
        </button>
      `;
      form.appendChild(passwordGroup);
    
      // Create url field 
      const urlGroup = document.createElement('div');
      urlGroup.className = 'form-group'; 
      urlGroup.innerHTML = `
        <label for="url">${this.root.messages.getMessage('stam:server-url')}</label>
        <input type="text" id="url" name="url" value="${accountInfo.url || ''}">
      `;
      form.appendChild(urlGroup);

      // Create dialog buttons
      let dialog = null;
      let dialogAnswer = null;
      var userNameInput = null;
      var passwordInput = null;
      var urlInput = null;
      const buttons = [
        { 
          label: this.root.messages.getMessage('stam:cancel'),
          className: 'btn-neutral',
          onClick: () => {
            dialogAnswer = null;
            dialog.close();
          }
        },
        {
          label: this.root.messages.getMessage(edited ? 'stam:update-awi-account' : 'stam:create-awi-account'),
          className: 'btn-negative',
          onClick: () => {
            dialogAnswer = { 
              userName: userNameInput.value.trim(), 
              password: passwordInput.value.trim(),
              url: urlInput.value.trim(),
              createAccount: true
            }
            dialog.close();
          }
        },
        {
          label: this.root.messages.getMessage('stam:connect'),
          className: 'btn-positive',
          onClick: () => {
            dialogAnswer = { 
              userName: userNameInput.value.trim(), 
              password: passwordInput.value.trim(),
              url: urlInput.value.trim(),
              createAccount: false
            };
            dialog.close();
          }
        }
      ];

      // Create and show the dialog
      dialog = new Dialog({
        title: this.root.messages.getMessage('stam:connection-dialog'),
        content: form,
        buttons: buttons,
        className: 'socket-connection-dialog',
        onOpen: () => {
          // Focus on username input when dialog opens
          userNameInput.focus();
        },
        onClose: () => {
          // If dialog is closed without clicking any button, treat as cancel
          resolve(dialogAnswer);
        }
      });
      dialog.open();
      userNameInput = document.getElementById('username');
      passwordInput = document.getElementById('password');
      urlInput = document.getElementById('url');

      var revealButton = document.getElementById('reveal-password');
      revealButton.addEventListener('click', () => {
        if (passwordInput.type === 'password') {
          passwordInput.type = 'text';
          revealButton.innerHTML = '<i class="fas fa-eye-slash"></i>';
          revealButton.title = 'Hide password';
        } else {
          passwordInput.type = 'password';
          revealButton.innerHTML = '<i class="fas fa-eye"></i>';
          revealButton.title = 'Reveal password';
        }
      });
      revealButton.addEventListener('mouseenter', () => {
        revealButton.style.backgroundColor = 'var(--button-hover, rgba(255, 255, 255, 0.1))';
      });
      revealButton.addEventListener('mouseleave', () => {
        revealButton.style.backgroundColor = 'transparent';
      });      

      var connectButton = dialog.buttons[2].element;
      connectButton.disabled = !userNameInput.value.trim() || !passwordInput.value.trim() || !urlInput.value.trim();
      userNameInput.addEventListener('input', () => {
        connectButton.disabled = !userNameInput.value.trim() || !passwordInput.value.trim() || !urlInput.value.trim();
      });
      passwordInput.addEventListener('input', () => {
        connectButton.disabled = !userNameInput.value.trim() || !passwordInput.value.trim() || !urlInput.value.trim();
      });
      urlInput.addEventListener('input', () => {
        connectButton.disabled = !userNameInput.value.trim() || !passwordInput.value.trim() || !urlInput.value.trim();
      });
    });
  }
}

export default SocketSideWindow;
