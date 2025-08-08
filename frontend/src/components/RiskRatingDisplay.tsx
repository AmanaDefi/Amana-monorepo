import React from 'react';
import { ExponentialRiskRating } from '@/types/exponentialTypes';
// We do not use local risk levels anymore; display Exponential poolRating directly

interface RiskRatingDisplayProps {
  riskRating: ExponentialRiskRating | null;
  isLoading?: boolean;
  showProtocolRisk?: boolean;
  showAssetRisk?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const RiskRatingDisplay: React.FC<RiskRatingDisplayProps> = ({
  riskRating,
  isLoading = false,
  showProtocolRisk = false,
  showAssetRisk = false,
  size = 'medium',
  className = '',
}) => {
  if (!riskRating) {
    return null;
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'text-xs';
      case 'large':
        return 'text-lg';
      default:
        return 'text-sm';
    }
  };

  const getCircleSize = () => {
    switch (size) {
      case 'small':
        return 'w-3 h-3';
      case 'large':
        return 'w-8 h-8';
      default:
        return 'w-6 h-6';
    }
  };

  const getRiskLevel = (rating: string) => {
    switch (rating) {
      case 'A':
      case 'Best':
        return 1;
      case 'B':
      case 'Good':
        return 2;
      case 'C':
      case 'D':
      case 'F':
      case 'Average':
      case 'Watch Out':
        return 3;
      default:
        return 1;
    }
  };

  const poolRiskLevel = getRiskLevel(riskRating.poolRating || 'A');

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Main Pool Risk Rating */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {isLoading ? (
            <div className={`${getCircleSize()} rounded-full bg-gray-400 animate-pulse`}></div>
          ) : (
            <div className={`${getCircleSize()} rounded-full bg-green-500 flex items-center justify-center`}>
              <span className="text-white font-bold text-xs">{riskRating.poolRating}</span>
            </div>
          )}
          <span className={`text-white font-medium ${getSizeClasses()}`}>
            {isLoading ? 'Loading...' : riskRating.poolRatingDescription}
          </span>
        </div>
      </div>

      {/* Exponential Attribution */}
      <div className="flex items-center gap-1">
        <span className={`text-gray-400 ${getSizeClasses()}`}>
          Assessed by{' '}
        </span>
        {riskRating.poolUrl ? (
          <a
            href={riskRating.poolUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-blue-400 hover:text-blue-300 underline ${getSizeClasses()}`}
          >
            exponential.fi
          </a>
        ) : (
          <span className={`text-blue-400 ${getSizeClasses()}`}>
            exponential.fi
          </span>
        )}
      </div>

      {/* Optional Protocol Risk */}
      {showProtocolRisk && riskRating.protocolRating && (
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-gray-400 ${getSizeClasses()}`}>
            Protocol: {riskRating.protocolRating}
          </span>
          {riskRating.protocolUrl && (
            <a
              href={riskRating.protocolUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-blue-400 hover:text-blue-300 underline ${getSizeClasses()}`}
            >
              View
            </a>
          )}
        </div>
      )}

      {/* Optional Asset Risk */}
      {showAssetRisk && riskRating.assetRating && (
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-gray-400 ${getSizeClasses()}`}>
            Asset: {riskRating.assetRating}
          </span>
          {riskRating.assetUrl && (
            <a
              href={riskRating.assetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-blue-400 hover:text-blue-300 underline ${getSizeClasses()}`}
            >
              View
            </a>
          )}
        </div>
      )}
    </div>
  );
};
