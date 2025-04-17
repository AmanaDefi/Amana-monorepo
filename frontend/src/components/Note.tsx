import { useState } from "react";

export function Note() {
    const [show, setShow] = useState<Boolean>(true);
    const handleClose = () => setShow(false);
    return (
        <>
            {show && <div className="relative text-black w-full text-center bg-amber-50 px-2 py-1 gap-2">
                <p>Secure your spot on the leaderboard by depositing now. Points are awarded for deposit size multiplied by length of time the deposit stays in the vault!</p>
                <div className="absolute right-2 top-0 cursor-pointer hover:text-red-400" onClick={handleClose}>x</div>
            </div>}
        </>
    )
}
