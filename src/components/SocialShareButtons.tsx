'use client'; // Required for event handlers

import React from 'react';
import {
  FacebookShareButton,
  TwitterShareButton,
  WhatsappShareButton,
  EmailShareButton, // Add EmailShareButton
  FacebookIcon,
  TwitterIcon,
  WhatsappIcon,
  EmailIcon, // Add EmailIcon
} from 'react-share';

interface SocialShareButtonsProps {
  url: string;
  title: string;
}

const SocialShareButtons: React.FC<SocialShareButtonsProps> = ({ url, title }) => {
  // Construct email body
  const emailBody = `Check out this page: ${url}`;

  return (
    <div style={{ display: 'flex', gap: '8px', marginTop: '16px', marginBottom: '16px' }}>
      <FacebookShareButton url={url} title={title}>
        <FacebookIcon size={32} round />
      </FacebookShareButton>

      <TwitterShareButton url={url} title={title}>
        <TwitterIcon size={32} round />
      </TwitterShareButton>

      <WhatsappShareButton url={url} title={title}>
        <WhatsappIcon size={32} round />
      </WhatsappShareButton>

      {/* Add Email Share Button */}
      <EmailShareButton url={url} subject={title} body={emailBody}>
        <EmailIcon size={32} round />
      </EmailShareButton>
    </div>
  );
};

export default SocialShareButtons;
