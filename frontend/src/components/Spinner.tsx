export const Spinner = ({color = 'white', size = 16}: {color?: string, size?: number}) => {
    return (
        <div className="flex items-center justify-center">
            <div className={`spinner-border animate-spin border-2 rounded-full w-[${size}px] h-[${size}px] border-${color} border-t-transparent`} />
        </div>
    )
}