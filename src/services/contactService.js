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

export const isContactPickerSupported = () => Capacitor.isNativePlatform();

export const pickDeviceContact = async () => {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Contact picker is available only on Android/iOS devices.');
  }

  const currentPermissions = await Contacts.checkPermissions();

  if (currentPermissions.contacts !== 'granted') {
    const requestedPermissions = await Contacts.requestPermissions();
    if (requestedPermissions.contacts !== 'granted') {
      throw new Error('Contacts permission is required to pick a contact.');
    }
  }

  const { contact } = await Contacts.pickContact({ projection });

  if (!contact) {
    throw new Error('No contact selected.');
  }

  const name = getDisplayName(contact);
  const phone = cleanPhone(contact.phones?.[0]?.number || '');

  return {
    name,
    phone
  };
};
