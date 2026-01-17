export default function Loading() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-zinc-800 rounded-lg" />
      <div className="h-32 bg-zinc-800/50 rounded-2xl" />
      <div className="h-48 bg-zinc-800/50 rounded-2xl" />
      <div className="h-24 bg-zinc-800/50 rounded-2xl" />
    </div>
  );
}
