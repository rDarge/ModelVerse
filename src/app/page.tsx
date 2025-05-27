import ChatInterface from '@/components/chat/ChatInterface';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-start min-h-screen bg-background p-4 sm:p-6 md:p-8 pt-12">
      <div className="w-full max-w-3xl h-[calc(100vh-8rem)] flex flex-col shadow-xl rounded-lg overflow-hidden border border-border">
        <header className="p-4 border-b border-border bg-card">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary text-center">
            ModelVerse
          </h1>
        </header>
        <ChatInterface />
      </div>
    </main>
  );
}
