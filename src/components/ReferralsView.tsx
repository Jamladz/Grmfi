import React from 'react';
import { ReferralHub, ReferralHubProps } from './ReferralHub';

export const ReferralsView: React.FC<ReferralHubProps> = (props) => {
  return <ReferralHub {...props} />;
};

export { ReferralHub };
