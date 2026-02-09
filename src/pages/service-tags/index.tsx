import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/tools/service-tags/',
      permanent: true
    }
  };
};

export default function ServiceTagsRedirect() {
  return null;
}
