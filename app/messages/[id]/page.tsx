import ChatThread from "@/components/ChatThread";

export default function ChatPage({ params }: { params: { id: string } }) {
  return <ChatThread id={params.id} />;
}
