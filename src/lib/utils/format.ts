export const formatAddressPlace = ({
  place,
  zip,
  country,
}: {
  place: string | null | undefined;
  zip: string | null | undefined;
  country: string | null | undefined;
}) => {
  return `${country}${zip || place ? '-' : ''}${zip ? `${zip}` : ''} ${place ? `${place}` : ''}`.trim();
};
