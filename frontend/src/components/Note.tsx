import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";

const note = "Deposit to any of the vaults below from any of our connected chains - Ethereum, Base, Polygon, BNB Smart Chain or Zetachain. Switch active chain using the wallet connection button in the top right hand corner of the screen!"

export function Note() {
    const [show, setShow] = useState<Boolean>(true);
    const handleClose = () => setShow(false);
    return (
        <>
            {/* {show && <div className="relative text-black w-full text-center bg-amber-50 px-2 py-1 gap-2">
                <p>Deposit to any of the vaults below from any of our connected chains - Ethereum, Base, Polygon, BNB Smart Chain or Zetachain.</p>
                <p>Switch active chain using the wallet connection button in the top right hand corner of the screen!</p>
                <div className="absolute right-2 top-0 cursor-pointer hover:text-red-400" onClick={handleClose}>x</div>
            </div>} */}
        </>
    )
}