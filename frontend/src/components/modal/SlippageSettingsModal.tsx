import Modal from "@/components/modal/Modal";
import React, {useEffect, useState} from "react";
import {Cog6ToothIcon} from "@heroicons/react/24/outline";
import {InformationCircleIcon} from "@heroicons/react/24/solid";
import ResponsiveTooltip from "@/components/common/Tooltip";
import {useSlippage} from "@/hooks/hooks";

export default function SlippageSettingsModal() {
    const { slippageValue, isAuto, setSlippage, toggleAuto } = useSlippage();
    const [openSlippageModal, setOpenSlippageModal] = useState(false);
    const [inputValue, setInputValue] = useState(slippageValue?.toString());

    useEffect(() => {
        setInputValue(slippageValue?.toString());
    }, [slippageValue]);

    const handleInputChange = (value: string) => {
        if (value === '') {
            setInputValue('');
            return;
        }

        if (/[^0-9.]/.test(value)) return;

        if ((value.match(/\./g) || []).length > 1) return;

        const numValue = parseFloat(value);

        if (value[value.length - 1] === '.' || numValue === 0) {
            setInputValue(value);
            return;
        }
        if (numValue <= 100) {
            if (numValue < 0.1) {
                setInputValue('0.1');
                setSlippage(0.1);
            } else {
                if (value.includes('.') && value.split('.')[1].length > 2) {
                    const fixedValue = numValue.toFixed(2);
                    setInputValue(fixedValue);
                    setSlippage(parseFloat(fixedValue));
                } else {
                    setInputValue(value);
                    if (!isNaN(numValue)) {
                        setSlippage(numValue);
                    }
                }
            }
        }
    };

    return (
        <>
            <button onClick={() => setOpenSlippageModal(!openSlippageModal)} className='group'>
                <Cog6ToothIcon
                    className='w-6 h-6 text-customGray300 group-hover:text-customGray200 group-hover:transition-transform group-hover:rotate-180 group-hover:!duration-700'/>
            </button>
            <Modal
                visibility={[openSlippageModal, setOpenSlippageModal]}
                title={<h2 className="text-white text-2xl">Transaction settings</h2>}
            >
                <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-2 mb-6'>
                    <div className='flex items-center gap-2'>
                        <span>Max slippage</span>
                        <button id='max-slipage-info-button' className='group'>
                            <InformationCircleIcon
                                className='w-5 h-5 text-customGray300 group-hover:text-white group-hover:transition-colors'/>
                        </button>
                        <ResponsiveTooltip
                            id={'max-slipage-info-button'}
                            content={<p className="w-28">{'Your transaction will revert if the price changes by more than the slippage percentage'}</p>}
                        />
                    </div>
                    <div className='rounded-5xl border border-customGray600 px-3 py-1.5 flex md:items-center justify-between'>
                        <button onClick={toggleAuto}
                                className={`group rounded-5xl px-4 py-1 bg-medium-purple-400/30 flex-center border border-transparent [&.selected]:bg-medium-purple-600 [&.selected]:border-medium-purple-600 transition-colors ${isAuto ? 'selected' : ''}`}
                        >
                            <span className='text-white text-sm group-[.selected]:text-white font-normal transition-colors'>Auto</span>
                        </button>
                        <div className='flex items-center justify-end'>
                            <input type='text'
                                   placeholder={'0'}
                                   className={`bg-transparent flex-1 max-w-[6ch] text-end outline-0 w-full ${isAuto && 'text-customGray400'}`}
                                   value={inputValue}
                                   onChange={(e) => handleInputChange(e.target.value)}
                                   onBlur={() => setInputValue(slippageValue.toString())}
                            />
                            <span className={`${isAuto && 'text-customGray400'}`}>%</span>
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    )
}
