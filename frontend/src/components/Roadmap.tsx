import { milestones } from "@/constants/roadmap";
import MilestoneCard from "./MilestoneCard";
import { Milestone } from "@/types/types";

export default function RoadMap() {
  return (
    <div className="w-full">
      <div className="p-4 roadmap-gradient">
        <div className="text-white text-[40px] font-bold p-4 ">
          Roadmap for <span className="text-[#308DFF]">2025</span>
        </div>
        <div className="flex w-full flex-wrap justify-evenly">
          {milestones.map((milestone: Milestone, index) => (
            <MilestoneCard milestone={milestone} key={index}/>
          ))}
        </div>
      </div>
    </div>
  );
}
