import Advice from "./components/Advice";
import Benefits from "./components/Benefits";
import Features from "./components/Features";
import Roadmap from "./components/Roadmap";
import Team from "./components/Team";

const AboutWrapper = ({}) => {
  return (
    <div>
      <Features />
      <Benefits />
      <Advice />
      <Roadmap />
      <Team />
    </div>
  );
};

export default AboutWrapper;
