import Advice from "./components/Advice";
import Benefits from "./components/Benefits";
import Features from "./components/Features";
import Roadmap from "./components/Roadmap";

const AboutWrapper = ({}) => {
  return (
    <div>
          <Features />
          <Benefits />
          <Advice />
          <Roadmap />
    </div>
  );
};

export default AboutWrapper;