import type { GetServerSideProps } from 'next';
import { getServiceTagPath } from '@/lib/serviceTagUrl';

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { serviceTag } = context.params ?? {};
  const encoded = Array.isArray(serviceTag) ? serviceTag[0] : serviceTag;

  return {
    redirect: {
      destination: encoded ? getServiceTagPath(encoded) : '/tools/service-tags/',
      permanent: true
    }
  };
};

export default function ServiceTagRedirect() {
  return null;
}
