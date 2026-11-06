// src/lib/tools/definitions.ts

export interface OllamaTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export const FILE_TOOLS: OllamaTool[] = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description:
        'Read the full contents of a file in the workspace. Use this before editing any file — you need to see the current content first.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description:
              'Path relative to workspace root, e.g. "src/App.tsx". No leading slash. No "..".',
          },
        },
        required: ['path'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'write_file',
      description:
        'Create a NEW file. Do NOT use this to overwrite or modify an existing file. If the file already exists, use edit_file instead. Parent directories are created automatically.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description:
              'Path relative to workspace root, e.g. "src/utils/format.ts". No leading slash.',
          },
          content: {
            type: 'string',
            description: 'The full content to write to the file.',
          },
        },
        required: ['path', 'content'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'edit_file',
      description:
        'Modify an EXISTING file by replacing a specific text snippet. ALWAYS use this tool to modify existing files. Do NOT use write_file for existing files unless you are replacing the entire content. You MUST first read the file to know the exact old_text. The old_text must appear exactly once in the file, otherwise the edit fails — include enough surrounding context to make it unique.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path relative to workspace root.',
          },
          old_text: {
            type: 'string',
            description:
              'Exact text to find. Must appear exactly once in the file.',
          },
          new_text: {
            type: 'string',
            description: 'Replacement text.',
          },
        },
        required: ['path', 'old_text', 'new_text'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'delete_file',
      description:
        'Delete a single file. Does NOT delete directories. Always confirm with the user before calling this — deletion is permanent.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path relative to workspace root.',
          },
        },
        required: ['path'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'list_directory',
      description:
        'List files and folders in a directory. Use "." for the workspace root. Sensitive files (.env, node_modules, .git) are hidden automatically.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description:
              'Path relative to workspace root, or "." for the root.',
          },
        },
        required: ['path'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'file_exists',
      description:
        'Check if a file exists and get its size. Cheaper than read_file when you just want to know if a file exists.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path relative to workspace root.',
          },
        },
        required: ['path'],
      },
    },
  },
];