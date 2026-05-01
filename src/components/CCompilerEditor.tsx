import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Trash2, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

interface CCompilerEditorProps {
  initialCode?: string;
  onCodeChange?: (code: string) => void;
  readOnly?: boolean;
}

const DEFAULT_CODE = `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}
`;

const PISTON_API_URL = "https://emkc.org/api/v2/piston/execute";

interface PistonResponse {
  run: {
    stdout: string;
    stderr: string;
    code: number | null;
    signal: string | null;
    output: string;
  };
  compile?: {
    stdout: string;
    stderr: string;
    code: number | null;
    signal: string | null;
    output: string;
  };
}

const CCompilerEditor = ({ initialCode, onCodeChange, readOnly = false }: CCompilerEditorProps) => {
  const [code, setCode] = useState(initialCode || DEFAULT_CODE);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "compile-error" | "runtime-error" | "api-error">("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Sync external code changes
  useEffect(() => {
    if (initialCode !== undefined && initialCode !== code) {
      setCode(initialCode);
    }
  }, [initialCode]);

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);
      onCodeChange?.(newCode);
    },
    [onCodeChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newCode = code.substring(0, start) + "    " + code.substring(end);
      handleCodeChange(newCode);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
        }
      }, 0);
    }
  };

  const runCode = async () => {
    if (running) return;

    setRunning(true);
    setOutput("");
    setError("");
    setStatus("idle");

    // Abort any previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Timeout after 15 seconds
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(PISTON_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          language: "c",
          version: "10.2.0",
          files: [{ name: "main.c", content: code }],
          compile_timeout: 10000,
          run_timeout: 5000,
          compile_memory_limit: -1,
          run_memory_limit: -1,
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data: PistonResponse = await response.json();

      // Check compilation errors
      if (data.compile && data.compile.code !== 0) {
        setError(data.compile.stderr || data.compile.output || "Compilation failed");
        setStatus("compile-error");
        return;
      }

      // Check runtime errors
      if (data.run.code !== 0 || data.run.signal) {
        const runtimeErr = data.run.stderr || data.run.output || "Runtime error";
        if (data.run.stdout) {
          setOutput(data.run.stdout);
        }
        setError(runtimeErr);
        setStatus("runtime-error");
        return;
      }

      // Success
      setOutput(data.run.stdout || data.run.output || "(no output)");
      setStatus("success");
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        setError("Execution timed out (possible infinite loop). Please check your code.");
        setStatus("api-error");
      } else {
        setError(`Failed to execute code: ${err.message}`);
        setStatus("api-error");
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  const clearCode = () => {
    handleCodeChange(DEFAULT_CODE);
    setOutput("");
    setError("");
    setStatus("idle");
  };

  return (
    <div className="flex flex-col h-full bg-background border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-card">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-auto">
          C Compiler
        </span>
        <Button variant="outline" size="sm" onClick={clearCode} disabled={running}>
          <Trash2 className="h-4 w-4 mr-1" /> Clear
        </Button>
        <Button size="sm" onClick={runCode} disabled={running}>
          {running ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-1" />
          )}
          {running ? "Running..." : "Run Code"}
        </Button>
      </div>

      {/* Code editor */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-[200px] relative">
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            spellCheck={false}
            className="absolute inset-0 w-full h-full resize-none p-3 font-mono text-sm bg-[#1e1e1e] text-[#d4d4d4] focus:outline-none focus:ring-0 border-none"
            placeholder="Write your C code here..."
          />
        </div>

        {/* Output section */}
        <div className="border-t max-h-[40%] min-h-[100px] flex flex-col">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-b">
            {status === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
            {(status === "compile-error" || status === "runtime-error" || status === "api-error") && (
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            )}
            <span className="text-xs font-medium text-muted-foreground">
              {status === "idle" && "Output"}
              {status === "success" && "Output — Success"}
              {status === "compile-error" && "Output — Compilation Error"}
              {status === "runtime-error" && "Output — Runtime Error"}
              {status === "api-error" && "Output — Error"}
            </span>
          </div>
          <ScrollArea className="flex-1">
            <pre className="p-3 text-xs font-mono whitespace-pre-wrap">
              {output && <span className="text-foreground">{output}</span>}
              {error && <span className="text-destructive">{error}</span>}
              {!output && !error && !running && (
                <span className="text-muted-foreground">Run your code to see output here...</span>
              )}
              {running && (
                <span className="text-muted-foreground animate-pulse">Executing...</span>
              )}
            </pre>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default CCompilerEditor;
