import { ClipboardIcon } from "@heroicons/react/24/outline";
import { ClipboardDocumentCheckIcon } from "@heroicons/react/24/outline";
import React, {useState} from "react";

type CopyTextButtonProps = {
    text: string
}
export default function CopyTextButton(props: CopyTextButtonProps) {
    const [copiedToClipboard, setCopiedToClipboard] = useState(false);
    const handleCopyAction = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(props.text);
            setCopiedToClipboard(true);

            setTimeout(() => {
                setCopiedToClipboard(false);
            }, 2000);
        } catch (err) {
            console.log('Failed to copy text:', err);
        }
    }
    return (
        <button className='flex-center relative z-[10]' onClick={handleCopyAction}>
            {
                copiedToClipboard ?
                    <ClipboardDocumentCheckIcon width={16} height={16} className='size-4 text-white' /> :
                    <ClipboardIcon width={16} height={16} className='size-4 text-customGray300 hover:text-white transition-colors' />
            }
        </button>
    )
}
