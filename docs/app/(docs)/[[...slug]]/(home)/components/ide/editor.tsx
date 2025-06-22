import { codeToHtml } from 'shiki';

const mockCode = `import React from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

const UserCard: React.FC<{ user: User }> = ({ user }) => {
  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold">{user.name}</h3>
      <p className="text-gray-600">{user.email}</p>
    </div>
  );
};

export default UserCard;`;

export const Editor = async () => {
  const code = await codeToHtml(mockCode, {
    lang: 'tsx',
    theme: 'vesper',
  });

  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: "required for shiki"
    <div
      className='overflow-auto p-4 text-sm [&_pre]:bg-transparent!'
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
};
