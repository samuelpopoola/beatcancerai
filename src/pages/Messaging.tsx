import React, { useState, useEffect, useRef } from 'react';
import { Send, Bell, MoreVertical } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { databaseService } from '../services/database';
import { useRealtimeChannel } from '../hooks/useRealtimeChannel';
import VideoCall from '../components/VideoCall';
import DoctorList from '../components/DoctorList';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'update';
  deliveredAt?: Date;
  readAt?: Date;
}

interface Caregiver {
  id: string;
  name: string;
  role: string;
  isOnline: boolean;
}

const Messaging: React.FC = () => {
  const { user } = useApp();
  const userId = user?.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [selectedCaregiver, setSelectedCaregiver] = useState<string>('');
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [roomUrl, setRoomUrl] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickUpdates = [
    'Feeling okay today',
    'Could use a hand',
    'Not feeling great',
    'Appointment reminder'
  ];

  useEffect(() => {
    if (userId) {
      loadCaregivers();
    }
  }, [userId]);

  useEffect(() => {
    if (userId && selectedCaregiver) {
      loadMessages();
    }
  }, [userId, selectedCaregiver]);

  // Realtime: subscribe to new messages involving this user
  useRealtimeChannel({
    channelName: userId ? `messages:${userId}` : 'messages',
    onInsert: (payload) => {
      const row = payload?.new;
      if (!row) return;
      if (!userId) return;
      // Only react if it involves current conversation participants
      if (row.sender_id === userId || row.sender_id === selectedCaregiver) {
        // Reload scoped history to avoid cross-chat contamination
        loadMessages();
        if (row.sender_id !== userId) {
          databaseService.markMessagesDelivered(userId).catch(() => {});
          databaseService.markMessagesRead(userId).catch(() => {});
        }
      }
    },
    filter: { table: 'messages' },
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!userId || !selectedCaregiver) return;
    try {
      const userMessages = await databaseService.getMessages(userId, selectedCaregiver);
      setMessages(userMessages);
      // Mark any incoming messages as delivered/read
      await databaseService.markMessagesDelivered(userId);
      await databaseService.markMessagesRead(userId);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadCaregivers = async () => {
    if (!userId) return;
    try {
      const userCaregivers = await databaseService.getCaregivers(userId);
      setCaregivers(userCaregivers);
      if (userCaregivers.length > 0) {
        setSelectedCaregiver(userCaregivers[0].id);
      }
    } catch (error) {
      console.error('Error loading caregivers:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedCaregiver || !userId) return;

    try {
      await databaseService.sendMessage({
        senderId: userId,
        receiverId: selectedCaregiver,
        message: newMessage,
        type: 'text',
        timestamp: new Date(),
      });
      setNewMessage('');
      loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const sendQuickUpdate = async (update: string) => {
    if (!selectedCaregiver || !userId) return;

    try {
      await databaseService.sendMessage({
        senderId: userId,
        receiverId: selectedCaregiver,
        message: update,
        type: 'update',
        timestamp: new Date(),
      });
      loadMessages();
    } catch (error) {
      console.error('Error sending quick update:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startVideoCall = async (doctorId?: string) => {
    const target = doctorId || selectedCaregiver || caregivers[0]?.id;
    if (!target) {
      alert('Select a clinician before starting a consultation.');
      return;
    }
    const url = `https://beatcancerai.daily.co/consultation-${target}-${Date.now()}`;
    setRoomUrl(url);
    setShowVideoCall(true);
  };

  const startChat = (doctorId: string) => {
    setSelectedCaregiver(doctorId);
    setShowVideoCall(false);
  };

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!userId) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center text-gray-600">
        Please sign in to view your messages.
      </div>
    );
  }

  return (
    <>
    <div className="max-w-4xl mx-auto h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Maria Garcia</h1>
              <p className="text-gray-600 text-sm">Patient</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Bell className="w-5 h-5 text-gray-400" />
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </div>
        </div>
        <div className="mt-4">
          {showVideoCall ? (
            <VideoCall roomUrl={roomUrl} onLeave={() => setShowVideoCall(false)} title="Video Consultation" />
          ) : (
            <button
              onClick={() => startVideoCall()}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-white"
            >
              <span role="img" aria-label="phone">📞</span>
              Start Video Consultation
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-gray-50 border-r border-gray-200 p-4">
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">Caregivers</h3>
            <div className="space-y-3">
              {caregivers.length === 0 && (
                <div className="text-sm text-gray-500 bg-white border border-gray-200 rounded-lg p-3">
                  No caregivers yet. Select a clinician or ask them to join.
                </div>
              )}
              {caregivers.map((caregiver) => (
                <div
                  key={caregiver.id}
                  className={`p-3 rounded-lg cursor-pointer ${
                    selectedCaregiver === caregiver.id
                      ? 'bg-blue-100 border border-blue-200'
                      : 'bg-white border border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedCaregiver(caregiver.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-800">{caregiver.name}</h4>
                      <p className="text-sm text-gray-600">{caregiver.role}</p>
                    </div>
                    <div className="flex items-center">
                      <div
                        className={`w-2 h-2 rounded-full mr-2 ${
                          caregiver.isOnline ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                      <span className="text-xs text-gray-500">
                        {caregiver.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Quick Updates</h3>
            <div className="space-y-2">
              {quickUpdates.map((update, index) => (
                <button
                  key={index}
                  onClick={() => sendQuickUpdate(update)}
                  className="w-full text-left p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
                >
                  {update}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <button className="w-full text-left p-2 text-red-600 hover:bg-red-50 rounded-lg text-sm">
              Log Out
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => {
              const isOwnMessage = message.senderId === userId;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      isOwnMessage
                        ? 'bg-blue-600 text-white'
                        : message.type === 'update'
                        ? 'bg-yellow-100 border border-yellow-200 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                  <p className="text-sm">{message.message}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isOwnMessage
                        ? 'text-blue-200'
                        : message.type === 'update'
                        ? 'text-yellow-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {isOwnMessage ? 'You' : message.senderName} •{' '}
                    {formatTime(message.timestamp)}
                    {isOwnMessage && (
                      <span className="ml-2 inline-flex items-center">
                        {message.readAt ? (
                          <span title="Read" className="text-green-300">✔✔</span>
                        ) : message.deliveredAt ? (
                          <span title="Delivered" className="text-blue-300">✔</span>
                        ) : (
                          <span title="Sending" className="text-gray-300">…</span>
                        )}
                      </span>
                    )}
                  </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex space-x-4">
              <input
                type="text"
                placeholder={selectedCaregiver ? 'Type a short update...' : 'Select a caregiver to start chatting'}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                disabled={!selectedCaregiver}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || !selectedCaregiver}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <DoctorList onStartVideo={startVideoCall} onStartChat={startChat} />
    </>
  );
};

export default Messaging;