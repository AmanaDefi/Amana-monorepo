import MainActionButton from "@/components/button/MainActionButton";

export default function MainButtonGroup({ label, mainAction, disabled }: { label: string, mainAction: Function, disabled: boolean }) {

  return (
    <>
      <MainActionButton
        label={label}
        handleClick={() => mainAction()}
        disabled={disabled}
      />
    </>
  )
}