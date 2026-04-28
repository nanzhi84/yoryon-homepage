import { collection, config, fields } from "@keystatic/core";

const tagsField = fields.array(fields.text({ label: "Tag" }), {
  label: "Tags",
  itemLabel: (props) => props.value
});

export default config({
  storage: {
    kind: "local"
  },
  collections: {
    blog: collection({
      label: "Blog",
      slugField: "title",
      path: "src/content/blog/*",
      format: { contentField: "content" },
      schema: {
        title: fields.slug({
          name: {
            label: "Title",
            validation: { isRequired: true }
          }
        }),
        description: fields.text({
          label: "Description",
          multiline: true,
          validation: { isRequired: true }
        }),
        pubDate: fields.date({
          label: "Publish date",
          validation: { isRequired: true }
        }),
        category: fields.text({
          label: "Category",
          validation: { isRequired: true }
        }),
        tags: tagsField,
        readingTime: fields.text({
          label: "Reading time",
          defaultValue: "3 min read",
          validation: { isRequired: true }
        }),
        featured: fields.checkbox({
          label: "Featured",
          defaultValue: false
        }),
        draft: fields.checkbox({
          label: "Draft",
          defaultValue: false
        }),
        content: fields.markdoc({
          label: "Content"
        })
      }
    }),
    projects: collection({
      label: "Projects",
      slugField: "title",
      path: "src/content/projects/*",
      format: { contentField: "content" },
      schema: {
        title: fields.slug({
          name: {
            label: "Title",
            validation: { isRequired: true }
          }
        }),
        summary: fields.text({
          label: "Summary",
          multiline: true,
          validation: { isRequired: true }
        }),
        role: fields.text({
          label: "Role",
          validation: { isRequired: true }
        }),
        period: fields.text({
          label: "Period",
          validation: { isRequired: true }
        }),
        type: fields.text({
          label: "Type",
          validation: { isRequired: true }
        }),
        platform: fields.text({
          label: "Platform",
          validation: { isRequired: true }
        }),
        stack: fields.text({
          label: "Stack",
          validation: { isRequired: true }
        }),
        order: fields.integer({
          label: "Order",
          defaultValue: 1,
          validation: { isRequired: true }
        }),
        tags: tagsField,
        content: fields.markdoc({
          label: "Project detail"
        })
      }
    })
  }
});
