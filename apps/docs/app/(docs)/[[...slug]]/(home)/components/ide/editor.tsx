import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";

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

export const Editor = () => (
  <DynamicCodeBlock
    code={mockCode}
    codeblock={{
      className: "rounded-none border-none shadow-none bg-transparent",
    }}
    lang="tsx"
  />
);
