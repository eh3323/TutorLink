import katex from "katex";

// minimal markdown-ish math renderer: splits a string into plain-text and
// math segments based on $...$ (inline) and $$...$$ (block) delimiters, then
// renders each math segment via katex. errors fall back to the raw input so
// nothing ever breaks the chat.

type Segment =
  | { type: "text"; value: string }
  | { type: "math"; value: string; display: boolean };

const MATH_REGEX = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;

function parse(input: string): Segment[] {
  const out: Segment[] = [];
  let lastIndex = 0;
  for (const match of input.matchAll(MATH_REGEX)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      out.push({ type: "text", value: input.slice(lastIndex, start) });
    }
    const raw = match[0];
    const isBlock = raw.startsWith("$$");
    const inner = isBlock ? raw.slice(2, -2).trim() : raw.slice(1, -1).trim();
    out.push({ type: "math", value: inner, display: isBlock });
    lastIndex = start + raw.length;
  }
  if (lastIndex < input.length) {
    out.push({ type: "text", value: input.slice(lastIndex) });
  }
  return out;
}

function renderMath(value: string, display: boolean) {
  try {
    return katex.renderToString(value, {
      displayMode: display,
      throwOnError: false,
      output: "html",
      strict: "ignore",
    });
  } catch {
    // never let bad math break the page
    return display ? `$$${value}$$` : `$${value}$`;
  }
}

type Props = {
  text: string;
  className?: string;
};

export function MathText({ text, className }: Props) {
  const segments = parse(text);
  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          // preserve newlines in the plain text portion
          const lines = seg.value.split("\n");
          return (
            <span key={i}>
              {lines.map((line, j) => (
                <span key={j}>
                  {line}
                  {j < lines.length - 1 ? <br /> : null}
                </span>
              ))}
            </span>
          );
        }
        return (
          <span
            key={i}
            className={seg.display ? "block py-1" : "inline"}
            dangerouslySetInnerHTML={{ __html: renderMath(seg.value, seg.display) }}
          />
        );
      })}
    </span>
  );
}
