import XLogo from "@public/logo/x.svg";
import LinkedInLogo from "@public/logo/linkedIn.svg";

const teamData = [
  {
    id: 1,
    name: "Richard Jamieson",
    position: "Founder & Full Stack Dev",
    image: "/team/Richard.png",
    linkedin: "#",
    twitter: "#",
  },
  {
    id: 2,
    name: "Quirin Huber",
    position: "Marketing & Strategy",
    image: "/team/Quirin.png",
    linkedin: "#",
    twitter: "#",
  },
  {
    id: 3,
    name: "Rohit Kumar Suman",
    position: "Co-founder",
    image: "/team/Rohit.png",
    linkedin: "#",
    twitter: "#",
  },
  {
    id: 4,
    name: "Mattes Groeger",
    position: "Full Stack Dev",
    image: "/team/Mattes.png",
    linkedin: "#",
    twitter: "#",
  },
  {
    id: 5,
    name: "Valentine Zlenko",
    position: "BD & Growth",
    image: "/team/Valentine.png",
    linkedin: "#",
    twitter: "#",
  },
];

const Team = ({}) => {
  return (
    <section className="mt-[364px]">
      <h1 className="text-white text-[48px] leading-[-0.04em] text-center font-bold mb-10">
        Meet Our Team
      </h1>

      <div className="container px-4 flex flex-col justify-center items-center">
        {/* First row - 2 members */}
        <div className="flex justify-between w-full max-w-[1034px] mb-10 items-center">
          {teamData.slice(0, 2).map((member) => (
            <div
              key={member.id}
              className="rounded-[24px] px-7 py-10 w-[469px] h-[516px] shadow-lg bg-[#0D1117] text-center"
            >
              <div className="relative w-[413px] h-[356px] rounded-[16px] overflow-hidden mb-6 mx-auto">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex flex-row justify-between items-center">
                <div className="flex flex-col gap-2 items-start justify-start">
                  <h3 className="text-white text-[24px] font-medium">
                    {member.name}
                  </h3>
                  <p className="text-gray-400 text-[16px] font-normal">
                    {member.position}
                  </p>
                </div>

                <div className="flex justify-center gap-3">
                  <a
                    href={member.linkedin}
                    className="w-10 h-10 bg-[#1B46E0] rounded-[2000px] flex items-center justify-center hover:bg-blue-700 transition-colors"
                  >
                    <LinkedInLogo width="21" height="20" />
                  </a>

                  <a
                    href={member.twitter}
                    className="w-10 h-10 bg-[#1B46E0] rounded-[2000px] flex items-center justify-center hover:bg-blue-700 transition-colors"
                  >
                    <XLogo width="21" height="20" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Second row - 3 members */}
        <div className="flex justify-between max-w-[1431px] w-full">
          {teamData.slice(2, 5).map((member) => (
            <div
              key={member.id}
              className="rounded-[24px] px-7 py-10 w-[469px] h-[516px] shadow-lg bg-[#0D1117] text-center"
            >
              <div className="relative w-[413px] h-[356px] rounded-[16px] overflow-hidden mb-6 mx-auto">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex flex-row justify-between items-center">
                <div className="flex flex-col gap-2 items-start justify-start">
                  <h3 className="text-white text-[24px] font-medium">
                    {member.name}
                  </h3>
                  <p className="text-gray-400 text-[16px] font-normal">
                    {member.position}
                  </p>
                </div>

                <div className="flex justify-center gap-3">
                  <a
                    href={member.linkedin}
                    className="w-10 h-10 bg-[#1B46E0] rounded-[2000px] flex items-center justify-center hover:bg-blue-700 transition-colors"
                  >
                    <LinkedInLogo width="21" height="20" />
                  </a>

                  <a
                    href={member.twitter}
                    className="w-10 h-10 bg-[#1B46E0] rounded-[2000px] flex items-center justify-center hover:bg-blue-700 transition-colors"
                  >
                    <XLogo width="21" height="20" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Team;
