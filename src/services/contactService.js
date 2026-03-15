import { Capacitor } from '@capacitor/core';
import { Contacts } from '@capacitor-community/contacts';

const projection = {
  name: true,
  phones: true
};

const cleanPhone = (value) => {
  if (!value) return '';
  return String(value).replace(/[^\d+]/g, '').trim();
};

const getDisplayName = (contact) => {
  if (!contact?.name) return '';

  if (contact.name.display) {
    return String(contact.name.display).trim();
  }

  const pieces = [contact.name.given, contact.name.middle, contact.name.family].filter(Boolean);
  return pieces.join(' ').trim();
};

const getPrimaryPhone = (contact) => {
  const firstNumber = (contact?.phones || []).find((entry) => cleanPhone(entry?.number))?.number || '';
  return cleanPhone(firstNumber);
};

const ensureContactsPermission = async () => {
  const currentPermissions = await Contacts.checkPermissions();

  if (currentPermissions.contacts !== 'granted') {
    const requestedPermissions = await Contacts.requestPermissions();
    if (requestedPermissions.contacts !== 'granted') {
      throw new Error('Contacts permission is required to pick a contact.');
    }
  }
};

export const isContactPickerSupported = () => Capacitor.isNativePlatform();

export const listDeviceContacts = async () => {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Contact picker is available only on Android/iOS devices.');
  }

  await ensureContactsPermission();

  const { contacts } = await Contacts.getContacts({ projection });
  const uniqueContacts = new Map();

  (contacts || []).forEach((contact) => {
    const name = getDisplayName(contact);
    const phone = getPrimaryPhone(contact);

    if (!name && !phone) return;

    const key = `${name.toLowerCase()}::${phone}`;
    if (!uniqueContacts.has(key)) {
      uniqueContacts.set(key, { name, phone });
    }
  });

  return Array.from(uniqueContacts.values()).sort((a, b) => {
    if (a.name && b.name) return a.name.localeCompare(b.name);
    if (a.name) return -1;
    if (b.name) return 1;
    return a.phone.localeCompare(b.phone);
  });
};

export const pickDeviceContact = async () => {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Contact picker is available only on Android/iOS devices.');
  }

  await ensureContactsPermission();

  const { contact } = await Contacts.pickContact({ projection });

  if (!contact) {
    throw new Error('No contact selected.');
  }

  const name = getDisplayName(contact);
  const phone = getPrimaryPhone(contact);

  return {
    name,
    phone
  };
};
