import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Notes({ children }: { children: string }) {
  return (
    <div
      className="space-y-2 text-sm leading-relaxed text-muted
        [&_a]:underline [&_a]:text-foreground
        [&_code]:rounded [&_code]:bg-background [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-foreground
        [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-background [&_pre]:p-3
        [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:text-foreground
        [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground
        [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-foreground
        [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
        [&_strong]:text-foreground"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
