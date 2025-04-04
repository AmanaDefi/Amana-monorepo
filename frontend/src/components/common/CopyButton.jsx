"use client";
import { useState } from "react";
import {Copy, Check} from 'lucide-react'

export default function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);

  const copyContent = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch (error) {
      console.log(error);
    }
    setTimeout(() => {
      setCopied(false);
    }, 1000);
  };
  return !copied ? (
    <Copy
      size={15}
      onClick={() => {
        copyContent(value);
      }}
    />
  ) : (
    <Check size={15} />
  );
}
