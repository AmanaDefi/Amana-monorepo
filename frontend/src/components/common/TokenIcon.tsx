import { Token } from "@/types/types";
import Image from "next/image";

interface TokenIconProps {
  token: Token;
  icon?: string;
  fullsize?: boolean;
  imageSize?: string
}

export default function TokenIcon({
  token,
  icon,
  fullsize = false,
  imageSize
}: TokenIconProps): JSX.Element {
  icon = icon || token?.imgURL;
  const className = `${imageSize ? imageSize : "w-6 md:w-10 h-6 md:h-10"
    } object-contain rounded-full`;

  if (icon) {
    return <Image 
    src={icon} 
    alt="token icon" 
    width={1200}
    height={800} 
    className="mr-2 rounded-full"
    />;
  }
  return (
    <Image
      src={"/vcx.svg"}
      alt="token icon"
      width={1200} // Adjust to your desired width
      height={800} // Adjust to your desired height    
      className={className}
    />
  );
}
