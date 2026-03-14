/**
 * PROFILECARD.TSX
 * Displays founder profile with headline, title, and focus areas
 */

import React from 'react';
import { Profile } from '../lib/types';

interface ProfileCardProps {
  profile: Profile;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ profile }) => {
  return (
    <div className="profile-card">
      <div className="profile-header">
        <h1 className="profile-name">{profile.name}</h1>
        <p className="profile-title">{profile.title}</p>
      </div>

      <p className="profile-headline">{profile.headline}</p>

      {profile.focus_areas && profile.focus_areas.length > 0 && (
        <div className="focus-areas">
          <h3>Focus Areas</h3>
          <ul>
            {profile.focus_areas.map((area) => (
              <li key={area}>{area}</li>
            ))}
          </ul>
        </div>
      )}

      {profile.bio && (
        <div className="profile-bio">
          <p>{profile.bio}</p>
        </div>
      )}
    </div>
  );
};
