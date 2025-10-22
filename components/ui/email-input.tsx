import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailInputProps {
  emails: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function EmailInput({ emails, onChange, placeholder, className }: EmailInputProps) {
  const [inputValue, setInputValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const addEmail = (email: string) => {
    const trimmedEmail = email.trim();
    if (trimmedEmail && isValidEmail(trimmedEmail) && !emails.includes(trimmedEmail)) {
      onChange([...emails, trimmedEmail]);
      setInputValue("");
    }
  };

  const removeEmail = (emailToRemove: string) => {
    onChange(emails.filter((email) => email !== emailToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmail(inputValue);
    } else if (e.key === "Backspace" && !inputValue && emails.length > 0) {
      // Remove last email if backspace on empty input
      removeEmail(emails[emails.length - 1]);
    }
  };

  const handleBlur = () => {
    // Add email on blur if valid
    if (inputValue.trim()) {
      addEmail(inputValue);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const pastedEmails = pastedText.split(/[\s,;]+/).filter(Boolean);
    
    const validEmails = pastedEmails.filter(
      (email) => isValidEmail(email) && !emails.includes(email.trim())
    );
    
    if (validEmails.length > 0) {
      onChange([...emails, ...validEmails.map((e) => e.trim())]);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5 min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {emails.map((email) => (
        <span
          key={email}
          className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800"
        >
          {email}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeEmail(email);
            }}
            className="inline-flex items-center justify-center rounded-sm hover:bg-blue-200 focus:outline-none"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onPaste={handlePaste}
        placeholder={emails.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] outline-none bg-transparent placeholder:text-muted-foreground"
      />
    </div>
  );
}

