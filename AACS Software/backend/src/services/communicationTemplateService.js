export const communicationTemplates = {
  booth_selection_coming_soon: {
    label: 'Booth selection coming soon',
    subject: ({ show }) => `Booth selection coming soon for ${show.name}`,
    message: ({ show, vendor, values }) => `Hello ${vendor.companyName || 'Vendor'},

Booth selection for ${show.name} is coming soon.

Venue: ${show.venueName || 'TBD'}
Show dates: ${values.showDates}
Your tier: ${vendor.tier}
Selection opens: ${values.opensAt}
Selection deadline: ${values.deadline}

Please make sure your vendor profile is complete before your selection window opens.
Profile: ${values.profileLink}
Floor map: ${values.floorMapLink}`
  },
  booth_selection_now_open: {
    label: 'Booth selection now open',
    subject: ({ show }) => `Booth selection is open for ${show.name}`,
    message: ({ show, vendor, values }) => `Hello ${vendor.companyName || 'Vendor'},

Your booth selection window is now open for ${show.name}.

Venue: ${show.venueName || 'TBD'}
Deadline: ${values.deadline}
Floor map: ${values.floorMapLink}

Please review the available booths and select your preferred booth.`
  },
  complete_vendor_profile: {
    label: 'Complete your vendor profile',
    subject: ({ show }) => `Complete your vendor profile for ${show.name}`,
    message: ({ show, vendor, values }) => `Hello ${vendor.companyName || 'Vendor'},

Please complete your vendor profile before selecting a booth for ${show.name}.

Required profile items include company name, contact name, and logo.
Profile: ${values.profileLink}

Once your profile is complete, you can return to the floor map when your selection window opens.`
  },
  booth_selection_reminder: {
    label: 'Booth selection reminder',
    subject: ({ show }) => `Reminder: select your booth for ${show.name}`,
    message: ({ show, vendor, values }) => `Hello ${vendor.companyName || 'Vendor'},

This is a reminder to select your booth for ${show.name}.

Your tier: ${vendor.tier}
Selection opened: ${values.opensAt}
Selection deadline: ${values.deadline}
Floor map: ${values.floorMapLink}

Please select your booth before the deadline.`
  },
  booth_confirmation: {
    label: 'Booth confirmation',
    subject: ({ show }) => `Booth confirmation for ${show.name}`,
    message: ({ show, vendor, values }) => `Hello ${vendor.companyName || 'Vendor'},

Your booth for ${show.name} is confirmed.

Booth: ${values.boothNumber || 'Assigned booth'}
Venue: ${show.venueName || 'TBD'}
Show dates: ${values.showDates}

Thank you for participating.`
  },
  admin_manual_assignment_notice: {
    label: 'Admin manual assignment notice',
    subject: ({ show }) => `Booth assignment update for ${show.name}`,
    message: ({ show, vendor, values }) => `Hello ${vendor.companyName || 'Vendor'},

An administrator has assigned your booth for ${show.name}.

Booth: ${values.boothNumber || 'Assigned booth'}
Venue: ${show.venueName || 'TBD'}
Show dates: ${values.showDates}
Floor map: ${values.floorMapLink}

Please contact the association team if you have questions.`
  }
};

export function renderCommunication({ type, show, vendorReadiness }) {
  const template = communicationTemplates[type] || communicationTemplates.booth_selection_reminder;
  const vendor = vendorReadiness?.vendor || {};
  const values = {
    showDates: formatRange(show.startDate, show.endDate),
    opensAt: formatCommunicationDateTime(vendorReadiness?.effectiveOpensAt) || 'Not scheduled',
    deadline: formatCommunicationDateTime(show.vendorSelectionDeadline) || 'Not set',
    profileLink: '/vendor/profile',
    floorMapLink: `/vendor/shows/${show.id}/floor-map`,
    boothNumber: vendorReadiness?.assignment?.boothNumber ? `Booth ${vendorReadiness.assignment.boothNumber}` : ''
  };
  return {
    communicationType: type,
    templateLabel: template.label,
    subject: template.subject({ show, vendor, values }),
    message: template.message({ show, vendor, values })
  };
}

function formatRange(startDate, endDate) {
  const start = formatCommunicationDate(startDate);
  const end = formatCommunicationDate(endDate);
  if (start && end) return `${start} to ${end}`;
  return start || end || 'TBD';
}

function formatCommunicationDate(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${Number(match[3])}/${Number(match[2])}/${match[1].slice(2)}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getDate()}/${date.getMonth() + 1}/${String(date.getFullYear()).slice(2)}`;
}

function formatCommunicationDateTime(value) {
  if (!value) return null;

  const datePart = formatCommunicationDate(value);
  const date = new Date(typeof value === 'string' ? value.replace(' ', 'T') : value);
  if (!datePart || Number.isNaN(date.getTime())) return datePart;

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return `${datePart} ${hours}:${minutes} ${period}`;
}
