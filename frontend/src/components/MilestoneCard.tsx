import { Milestone, StepStatus } from "@/types/types";
import { CheckIcon } from "@heroicons/react/24/solid";

const colors: string[] = ["#308DFF", "#00B2BF", "#32B94F", "#FFFFFF"];

interface MilestoneCardProps {
  milestone: Milestone;
}

export default function MilestoneCard({ milestone }: MilestoneCardProps) {
  return (
    <div className="rounded-[50px] w-[332px] mb-8 h-[506px] bg-card p-4 milestone-gradient">
      <div className="text-[50px] p-4 font-bold">{milestone.title}</div>
      <div className="">
        <div className="">
          {milestone.steps.map((step, index) => (
            <div key={index}>
              <div className="relative my-2">
                <div className="flex items-center justify-center w-[30px] h-[30px]">
                  {step.status == StepStatus.completed ? (
                    <div
                      className="rounded-full flex items-center justify-center text-black w-[30px] h-[30px]"
                      style={{ backgroundColor: colors[index] }}
                    >
                      <CheckIcon className="text-md font-bold w-6 h-6" />
                    </div>
                  ) : (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <div className="absolute left-10 top-1">{step.description}</div>
              </div>
              {index != 3 && (
                <div className="ml-[14px] w-[2px] h-12 bg-white"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
