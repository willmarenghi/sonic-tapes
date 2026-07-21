import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Notes({ children }: { children: string }) {
  return (
    <div
      className="space-y-2 text-sm leading-relaxed text-neutral-300
        [&_a]:underline [&_a]:text-neutral-100
        [&_code]:rounded [&_code]:bg-neutral-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-neutral-100
        [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-neutral-900 [&_pre]:p-3
        [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:text-neutral-100
        [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-neutral-100
        [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-neutral-100
        [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
        [&_strong]:text-neutral-100"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
