import useKakao from '@/hooks/useKakao';
import React, { useMemo } from 'react';

const GeoLocation = ({
  addressRef,
  children,
}: {
  addressRef?: React.MutableRefObject<{
    address: string;
    coord: {
      latitude: number;
      longitude: number;
    };
  } | null>;
  children?: React.ReactNode;
}) => {
  const [address, setRef] = useKakao();
  const kakaoRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (kakaoRef.current) {
      setRef(kakaoRef.current);
    }
  }, [kakaoRef]);

  React.useEffect(() => {
    if (address && addressRef) {
      addressRef.current = address;
    }
  }, [address]);
  return (
    <>
      <div ref={kakaoRef} style={{ width: '600px', height: '400px' }}></div>
      {children}
    </>
  );
};

export default GeoLocation;
