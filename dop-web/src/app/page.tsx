'use client';

import { useState, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { Send, Bot, User, Settings, FileText } from 'lucide-react';

export default function Home() {
  const [onboarding, setOnboarding] = useState(true);
  const [persona, setPersona] = useState('');
  const [goals, setGoals] = useState('');
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string>('');
  const [model, setModel] = useState('llama3');

  useEffect(() => {
    fetch('/api/onboarding?agentId=default')
      .then(res => res.json())
      .then(data => {
        setOnboarding(!data.exists);
        if (data.exists) {
          // Initialize session
          setSessionId(crypto.randomUUID());
        }
        setLoading(false);
      });
  }, []);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: {
      sessionId,
      model
    }
  });

  const completeOnboarding = async () => {
    setLoading(true);
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'default', persona, goals }),
    });
    setOnboarding(false);
    setSessionId(crypto.randomUUID());
    setLoading(false);
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-950 text-white">Loading...</div>;

  if (onboarding) {
    return (
      <main className="flex h-screen items-center justify-center bg-gray-950 text-gray-100 p-6">
        <div className="max-w-lg w-full bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <Bot className="w-8 h-8 text-emerald-400" />
            <h1 className="text-2xl font-bold">Agent Onboarding</h1>
          </div>
          <p className="text-gray-400 mb-6">Let's define the SOUL of your memory agent.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Persona & Identity</label>
              <textarea 
                value={persona} onChange={e => setPersona(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white h-24"
                placeholder="You are a brilliant strategic advisor..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Goals & Focus</label>
              <textarea 
                value={goals} onChange={e => setGoals(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white h-24"
                placeholder="Help me structure my business ideas and recall references..."
              />
            </div>
            <button 
              onClick={completeOnboarding}
              disabled={!persona || !goals}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-lg disabled:opacity-50"
            >
              Initialize SOUL
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Left Sidebar - Options */}
      <aside className="w-64 border-r border-gray-800 bg-gray-900 flex flex-col">
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <Bot className="text-emerald-400" />
          <h2 className="font-bold">Death of Prompt</h2>
        </div>
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div>
            <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
              <Settings className="w-4 h-4"/> Active Model
            </label>
            <select 
              value={model} 
              onChange={e => setModel(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white outline-none"
            >
              <option value="llama3">Llama 3</option>
              <option value="mistral">Mistral</option>
              <option value="phi3">Phi-3</option>
            </select>
          </div>
          <div>
             <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2 mb-3">
               <FileText className="w-4 h-4"/> Memory State
             </h3>
             <div className="text-xs text-gray-500 bg-gray-800/50 p-3 rounded-lg border border-gray-800">
               Session ID: {sessionId.substring(0,8)}...<br/>
               Agent: default<br/>
               Context Injected: SOUL, Index
             </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Window */}
      <section className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-8 space-y-6" id="chat-container">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-20">
              <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Your agent is initialized. How can I assist you?</p>
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} className={`flex max-w-3xl mx-auto gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`p-3 rounded-full h-11 w-11 flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                {m.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={`p-4 rounded-2xl max-w-[80%] whitespace-pre-wrap ${m.role === 'user' ? 'bg-indigo-900 border border-indigo-700 text-indigo-50' : 'bg-gray-800 border border-gray-700 text-gray-100'}`}>
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex max-w-3xl mx-auto gap-4">
              <div className="p-3 rounded-full h-11 w-11 flex items-center justify-center shrink-0 bg-emerald-600">
                <Bot className="w-5 h-5" />
              </div>
              <div className="p-4 rounded-2xl bg-gray-800 border border-gray-700 flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-950 border-t border-gray-800">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-3">
            <input 
              value={input}
              onChange={handleInputChange}
              className="flex-1 rounded-xl bg-gray-900 text-white border border-gray-700 px-6 py-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="Ask away or submit a slice of knowledge..."
              disabled={isLoading}
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 rounded-xl flex items-center justify-center shadow-lg disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
