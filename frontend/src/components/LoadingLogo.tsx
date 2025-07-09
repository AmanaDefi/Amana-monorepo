import React from "react";

const LoadingLogo: React.FC = () => {
  return (
    <div className="flex justify-center items-center py-12">
      <svg
        viewBox="0 0 41 30"
        width="120"
        height="90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-pulse"
      >
        <path
          d="M13.6237 4.59025C13.4619 4.73433 13.3035 4.88456 13.149 5.04094C9.21852 9.01697 9.21851 15.4634 13.1489 19.4394H10.6229C5.30831 19.4394 1 15.0811 1 9.7049L1 1.62183L2.24294 1.37405C6.50609 0.524181 10.6643 1.86375 13.6237 4.59025ZM13.6237 4.59025C17.4574 1.17737 23.244 1.21554 27.034 4.70477M13.6237 4.59025C15.8579 6.64859 17.4089 9.49738 17.8059 12.7913C18.1277 15.4612 17.7014 18.1687 16.5756 20.6053L14.7487 24.5589C14.0036 26.1717 15.1672 28.0212 16.927 28.0212C17.6197 28.0212 18.2834 27.7137 18.7399 27.1867C21.0976 24.4652 22.5867 21.0441 22.9584 17.445L23.4964 12.2345C23.8037 9.25921 25.111 6.65359 27.034 4.70477M27.034 4.70477C27.1521 4.81347 27.2682 4.92553 27.3823 5.04093C31.3127 9.01697 31.3127 15.4634 27.3823 19.4394L30.3771 19.4394C35.6917 19.4394 40 15.0811 40 9.70489L40 1.62182L38.187 1.2604C33.9546 0.416664 29.8392 1.86189 27.034 4.70477Z"
          stroke="url(#gradient)"
          strokeWidth="2"
          strokeLinejoin="bevel"
          className="animate-dash"
        />

        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1B46E0">
              <animate
                attributeName="offset"
                values="0;1;0"
                dur="3s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor="#ffffff">
              <animate
                attributeName="offset"
                values="0.5;1.5;0.5"
                dur="3s"
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>
        </defs>

        <style jsx>{`
          @keyframes dash {
            0% {
              stroke-dasharray: 1, 200;
              stroke-dashoffset: 0;
            }
            50% {
              stroke-dasharray: 90, 200;
              stroke-dashoffset: -35;
            }
            100% {
              stroke-dasharray: 1, 200;
              stroke-dashoffset: -125;
            }
          }

          .animate-dash {
            animation: dash 3s ease-in-out infinite;
          }
        `}</style>
      </svg>

      <div className="ml-4 text-lg font-medium text-gray-100 animate-pulse">
        Loading Earning Opportunites...
      </div>
    </div>
  );
};

export default LoadingLogo;
