import { CodeBlock } from "@repo/design-system/components/ultracite/code-block/server";

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
  <CodeBlock
    className="overflow-auto rounded-none border-none bg-transparent!"
    code={mockCode}
    lang="tsx"
  />
);
