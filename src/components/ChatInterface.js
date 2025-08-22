import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import WalletStatus from './WalletStatus';
import AIService from '../services/AIService';

const ChatInterface = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: '👋 **Welcome to Circle Layer DeFi Assistant!**\n\nYour intelligent companion for DeFi operations on Circle Layer blockchain.\n\n**Quick Start:**\n• "What\'s my balance?" - Check wallet funds\n• "Claim faucet" - Get free CLAYER tokens\n• "Send X CLAYER to 0x..." - Transfer tokens\n• "Show staking options" - Earn rewards\n• "Explain yield farming" - Learn DeFi\n\n**Need testnet tokens?** Just say "faucet" or "claim faucet"! 🚰\n\n**Just chat naturally - I understand what you need!** 🚀',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await AIService.processMessage(inputMessage);
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.text,
        timestamp: new Date(),
        messageType: response.type,
        data: response.data
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: '❌ Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date(),
        messageType: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageContent = (content) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className="chat-container">
      {/* Sidebar */}
      <div className="chat-sidebar">
        <div className="sidebar-section">
          <Link to="/" style={{ 
            color: '#6366f1', 
            textDecoration: 'none', 
            fontWeight: '600',
            fontSize: '1.1rem',
            display: 'block',
            marginBottom: '1rem'
          }}>
            ← Back to Home
          </Link>
          
          <h3 className="sidebar-title">Example Queries</h3>
          <div style={{ color: '#6b7280', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <p><strong>💰 Balance & Wallet:</strong></p>
            <p>"What's my balance?"</p>
            <p>"Show my wallet address"</p>
            
            <p style={{ marginTop: '1rem' }}><strong>🚀 Transactions:</strong></p>
            <p>"Send 1.5 Circle Layer to 0x..."</p>
            <p>"Show transaction history"</p>
            
            <p style={{ marginTop: '1rem' }}><strong>📈 Market Data:</strong></p>
            <p>"ETH price"</p>
            <p>"Show BTC and USDC prices"</p>
            
            <p style={{ marginTop: '1rem' }}><strong>❓ General:</strong></p>
            <p>"What is DeFi?"</p>
            <p>"How to stake tokens?"</p>
          </div>
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-title">Security Tips</h3>
          <div style={{ color: '#6b7280', fontSize: '0.9rem', lineHeight: '1.5' }}>
            <p><strong>�️ Stay Safe:</strong></p>
            <ul style={{ paddingLeft: '1rem', marginTop: '0.5rem' }}>
              <li>Always verify addresses before sending</li>
              <li>Check gas fees during transactions</li>
              <li>Never share your private keys</li>
              <li>Start with small amounts when testing</li>
              <li>Double-check transaction details</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {/* Header */}
        <div className="chat-header">
          <h1 className="chat-title">DeFi AI Assistant</h1>
          <WalletStatus />
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.type}`}>
              <div className="message-avatar">
                {message.type === 'user' ? 'You' : '🤖'}
              </div>
              <div className="message-content">
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: formatMessageContent(message.content) 
                  }}
                />
                {message.messageType && (
                  <div style={{ 
                    fontSize: '0.8rem', 
                    opacity: 0.7, 
                    marginTop: '0.5rem',
                    fontStyle: 'italic'
                  }}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message bot">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="loading">
                  <div className="loading-dots">
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                  </div>
                  Thinking...
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="chat-input-container">
          <div className="chat-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about DeFi, check your balance, send tokens, or anything else..."
              className="chat-input"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="send-button"
            >
              {isLoading ? (
                <div className="loading-dots">
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                </div>
              ) : (
                <>
                  Send 🚀
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
