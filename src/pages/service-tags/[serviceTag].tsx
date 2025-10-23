import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { serviceTag } = context.params ?? {};
  const encoded = Array.isArray(serviceTag) ? serviceTag[0] : serviceTag;

  return {
    redirect: {
      destination: encoded ? `/tools/service-tags/${encodeURIComponent(encoded)}` : '/tools/service-tags',
      permanent: true
    }
  };
};

export default function ServiceTagRedirect() {
  return null;
}
