export const CheckBox = ({isSelected}: {isSelected: boolean}) => {
    return (
        <div className="flex items-center justify-center bg-[#0C1015] h-4 w-4 rounded-full">
            {isSelected && <div className="h-[6px] w-[6px] bg-blue-button rounded-full" />}
        </div>
    )
}