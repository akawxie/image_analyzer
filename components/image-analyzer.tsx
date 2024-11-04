'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from 'ai/react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Upload } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import axios from 'axios'
import Image from 'next/image'

type UserMessage = {
  type: 'text' | 'image';
  content: string;
  filename?: string;
  role?: 'user' | 'ai';
}

export function ImageAnalyzerComponent() {
  const [files, setFiles] = useState<File[]>([])
  const { messages, input, setInput } = useChat()
  const [error, setError] = useState('')
  const [userMessages, setUserMessages] = useState<UserMessage[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const defaultPrompts = [
    "Caption this image",
    "Describe the main elements",
    "What emotions does it evoke?",
    "Identify any text present",
    "Generate a prompt to recreate this image"
  ]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, userMessages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setFiles([file])
      const previewUrl = URL.createObjectURL(file)
      setUserMessages(prevMessages => [
        ...prevMessages,
        { type: 'image', content: previewUrl, filename: file.name, role: 'user' }
      ])
      setError('')
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (input.trim() || files.length > 0) {
      setUserMessages(prevMessages => [
        ...prevMessages,
        { type: 'text', content: input, role: 'user' }
      ])
      await handleImageAnalysis(input)
      setInput('')
    } else {
      setError('Please upload an image or enter a prompt.')
    }
  }

  const handlePresetPrompt = (prompt: string) => {
    setUserMessages(prevMessages => [
      ...prevMessages,
      { type: 'text', content: prompt, role: 'user' }
    ])
    handleImageAnalysis(prompt)
  }

  const handleImageAnalysis = async (prompt: string) => {
    if (files.length === 0) return

    const base64Image = await convertToBase64(files[0])
    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY

    try {
      const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: "llama-3.2-11b-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
            ]
          }
        ],
        temperature: 1,
        max_tokens: 1024,
        top_p: 1,
        stream: false,
        stop: null,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      })

      const modelResponse = response.data.choices[0].message.content
      setUserMessages(prevMessages => [
        ...prevMessages,
        { type: 'text', content: `AI: ${modelResponse}`, role: 'ai' }
      ])
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("API Error:", error.response ? error.response.data : error.message)
      } else {
        console.error("Unexpected Error:", error)
      }
      setError('Error processing the image. Please check the console for more details.')
    }
  }

  const convertToBase64 = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (reader.result) {
          resolve(reader.result.split(',')[1]);
        } else {
          reject(new Error("File reading failed: result is null"));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-3xl mx-auto shadow-lg">
        <CardHeader className="bg-blue-600 text-white rounded-t-lg">
          <CardTitle className="text-3xl font-bold text-center">Image Analyzer</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ScrollArea className="h-[50vh] pr-4 mb-6 border border-gray-200 rounded-lg shadow-inner">
            <div className="p-4">
              {userMessages.map((userMessage, index) => (
                <div key={index} className={`flex ${userMessage.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                  <div className={`flex items-start max-w-[80%] ${userMessage.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>{userMessage.role === 'user' ? 'U' : 'AI'}</AvatarFallback>
                    </Avatar>
                    <div className={`mx-2 p-3 rounded-lg ${userMessage.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      {userMessage.type === 'image' ? (
                        <Image src={userMessage.content} alt="User uploaded" width={500} height={300} className="max-w-full h-auto rounded" />
                      ) : (
                        <p className="text-sm">{userMessage.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} /> {/* This is crucial for scrolling */}
            </div>
          </ScrollArea>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="mb-6 grid grid-cols-2 gap-2">
            {defaultPrompts.map((prompt, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handlePresetPrompt(prompt)}
                className="text-xs bg-gray-50 hover:bg-gray-100 transition-colors duration-200 rounded-full text-left px-4 py-2 h-auto"
              >
                {prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt}
              </Button>
            ))}
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex items-center space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                size="icon" 
                className="bg-white hover:bg-blue-50 transition-colors duration-200"
                onClick={handleUploadClick}
              >
                <Upload className="h-4 w-4 text-blue-600" />
              </Button>
              <Input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your prompt here..."
                className="flex-grow border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-md shadow-sm"
              />
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 transition-colors duration-200">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}