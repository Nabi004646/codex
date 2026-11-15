// Original job-based guidance drawn from the listed primary documentation.
// Candidates are not feature-parity claims. Keep source and review dates visible.
export const alternativeGuides = [
  {
    "slug": "adobe-photoshop",
    "name": "Adobe Photoshop",
    "aliases": [
      "Photoshop",
      "Adobe PS",
      "PSD editor"
    ],
    "intro": "Choose a candidate by the work you need: photo editing and compositing, or painting and illustration. Keep the original PSD and test a representative document before changing an established workflow.",
    "alternatives": [
      {
        "name": "GIMP",
        "fit": "Raster-image editing and compositing with an editable XCF working file.",
        "limits": "PSD compatibility is not complete. Some imported features can differ; saving XCF preserves GIMP project data, while an exported delivery image serves a different purpose.",
        "migration": "Duplicate one PSD, open it and inspect layers, masks, text and appearance. Save a separate XCF working copy. Export the agreed delivery format and compare it with the original reference; keep the original PSD for handoff.",
        "source_urls": [
          "https://docs.gimp.org/3.0/en/glossary.html",
          "https://docs.gimp.org/3.0/en/gimp-images-out.html"
        ]
      },
      {
        "name": "Krita",
        "fit": "Drawing and painting workflows where editable artwork matters more than matching every Photoshop feature.",
        "limits": "Krita supports a range of PSD data but does not promise complete PSD interchange. Its documentation recommends other interchange formats, including OpenRaster or TIFF, where suitable.",
        "migration": "Try a copy of a representative PSD, inspect its layers and visible result, and keep a native Krita working copy. Agree on an interchange format with collaborators and check that exported file in the receiving application.",
        "source_urls": [
          "https://docs.krita.org/en/general_concepts/file_formats/file_psd.html",
          "https://docs.krita.org/en/KritaFAQ.html"
        ]
      }
    ],
    "source_checked_at": "2026-11-15",
    "review_method": "Publisher documentation reviewed; no hands-on migration or feature-parity test claimed."
  },
  {
    "slug": "adobe-premiere",
    "name": "Adobe Premiere",
    "aliases": [
      "Premiere Pro",
      "Adobe Premiere Pro",
      "Premiere"
    ],
    "intro": "These editors are candidates for cutting and exporting a video. Project files, media references, effects and finished-video exports are separate things; a change of editor needs a small migration trial.",
    "alternatives": [
      {
        "name": "Shotcut",
        "fit": "Editing clips, arranging a timeline and exporting a finished video.",
        "limits": "Shotcut saves its editable project as MLT XML, which references source media rather than containing it. A saved project is not the video file you deliver.",
        "migration": "Keep the original Premiere project and source clips. Build a short sample edit in a new Shotcut project, keep media paths organized, and use Export to create the delivery video. Check the result before rebuilding a longer timeline.",
        "source_urls": [
          "https://www.shotcut.org/FAQ/",
          "https://forum.shotcut.org/t/project-management/12574"
        ]
      },
      {
        "name": "Kdenlive",
        "fit": "Multitrack video editing with an editable Kdenlive project and native OpenTimelineIO interchange.",
        "limits": "Kdenlive's documented OTIO exchange does not export effects, filters or transitions. Project files normally reference media; exchanging a timeline is not a guarantee of visual parity.",
        "migration": "Preserve the original project and media. If using OTIO, first confirm the other editor can supply a compatible timeline, then inspect clip timing, markers, project resolution and recreated effects. Save a Kdenlive project and render a short comparison video.",
        "source_urls": [
          "https://docs.kdenlive.org/en/user_interface/menu/file_menu.html",
          "https://kdenlive.org/news/releases/25.04.0/",
          "https://docs.kdenlive.org/en/project_and_asset_management/file_management/project_files.html"
        ]
      }
    ],
    "source_checked_at": "2026-11-15",
    "review_method": "Publisher documentation reviewed; no hands-on migration or feature-parity test claimed."
  },
  {
    "slug": "adobe-illustrator",
    "name": "Adobe Illustrator",
    "aliases": [
      "Illustrator",
      "Adobe AI",
      "vector editor"
    ],
    "intro": "Inkscape is a candidate for vector artwork such as diagrams, icons and illustrations. The useful test is whether the actual document and required export survive your handoff.",
    "alternatives": [
      {
        "name": "Inkscape",
        "fit": "Editing SVG vector artwork, with documented import support for Illustrator and PDF formats.",
        "limits": "Some imported formats expose only part of their original features, and some import support depends on installed helper programs. Do not assume an Illustrator document remains fully editable or visually identical.",
        "migration": "Keep the original AI file. Try an Illustrator-exported SVG or a supported AI/PDF copy, inspect text, shapes, clipping and appearance, then save an Inkscape SVG working copy. Export the recipient's required format and check that output before committing.",
        "source_urls": [
          "https://inkscape-manuals.readthedocs.io/en/latest/import-other-formats.html",
          "https://wiki.inkscape.org/wiki/Inkscape_for_Adobe_Illustrator_users"
        ]
      }
    ],
    "source_checked_at": "2026-11-15",
    "review_method": "Publisher documentation reviewed; no hands-on migration or feature-parity test claimed."
  },
  {
    "slug": "microsoft-office",
    "name": "Microsoft Office",
    "aliases": [
      "Microsoft 365",
      "Office",
      "Word",
      "Excel",
      "PowerPoint"
    ],
    "intro": "LibreOffice is a candidate for local documents, spreadsheets and presentations. Office file compatibility should be checked with the files your classmates, clients or colleagues actually exchange.",
    "alternatives": [
      {
        "name": "LibreOffice",
        "fit": "Writer, Calc and Impress can open and save corresponding Microsoft Office document formats, including Office Open XML.",
        "limits": "Opening an Office file does not guarantee identical behavior. VBA compatibility is incomplete; documents that depend on macros need a separate compatibility review.",
        "migration": "Work on copies of representative DOCX, XLSX and PPTX files. Inspect layout, formulas and presentation output, and review macro-dependent tasks separately. Save an OpenDocument working copy when appropriate; use Save As for required Office handoff formats and recheck them.",
        "source_urls": [
          "https://help.libreoffice.org/latest/en-US/text/shared/guide/ms_user.html",
          "https://help.libreoffice.org/latest/en-GB/text/sbasic/shared/vbasupport.html"
        ]
      }
    ],
    "source_checked_at": "2026-11-15",
    "review_method": "Publisher documentation reviewed; no hands-on migration or feature-parity test claimed."
  },
  {
    "slug": "zapier",
    "name": "Zapier",
    "aliases": [
      "Zapier automation",
      "Zaps",
      "workflow automation"
    ],
    "intro": "Node-RED is a candidate when you can run and maintain a flow-based automation runtime. Choosing open-source software changes the hosting and maintenance responsibilities; it does not supply every hosted-service connector or allowance.",
    "alternatives": [
      {
        "name": "Node-RED",
        "fit": "Building flows on a local computer, device or server, with JSON import and export for Node-RED flows.",
        "limits": "Node-RED uses the Apache 2.0 license, but third-party nodes can have separate licenses. Runtime hosting, connected-service terms, credentials and ongoing maintenance still require attention.",
        "migration": "Write down the original trigger, input, rules and actions, then recreate a harmless sample flow with fictional data. Node-RED's JSON import/export applies to its own flows; do not assume a Zapier workflow can be imported unchanged. Export the tested flow and separately document required nodes and configuration.",
        "source_urls": [
          "https://nodered.org/docs/getting-started/",
          "https://nodered.org/docs/user-guide/editor/workspace/import-export",
          "https://nodered.org/about/license/"
        ]
      }
    ],
    "source_checked_at": "2026-11-15",
    "review_method": "Publisher documentation reviewed; no hands-on migration or feature-parity test claimed."
  },
  {
    "slug": "figma",
    "name": "Figma",
    "aliases": [
      "Figma design",
      "Figma UI",
      "interface design"
    ],
    "intro": "Penpot is an open-source interface-design candidate. For an existing Figma design system, use the publisher's migration process and validate a representative file before moving a whole workspace.",
    "alternatives": [
      {
        "name": "Penpot",
        "fit": "Interface design and prototyping, with a documented Figma-to-Penpot migration workflow.",
        "limits": "The official exporter supports one-off migration, not continuous synchronization. The migration guide expects layout cleanup and review of libraries, tokens and plugins; a native Penpot file is its own format.",
        "migration": "Audit the files and libraries you need. Trial the official Penpot Exporter on one representative Figma file, or move suitable static assets as SVG/PNG/JPG. Check layout, components and tokens, record cleanup steps, and retain native exports from both tools during the transition.",
        "source_urls": [
          "https://help.penpot.app/user-guide/first-steps/migration-guide/",
          "https://help.penpot.app/user-guide/export-import/export-import-files/"
        ]
      }
    ],
    "source_checked_at": "2026-11-15",
    "review_method": "Publisher documentation reviewed; no hands-on migration or feature-parity test claimed."
  },
  {
    "slug": "autodesk-maya",
    "name": "Autodesk Maya",
    "aliases": [
      "Maya",
      "Autodesk 3D",
      "3D animation"
    ],
    "intro": "Blender is a candidate for modeling, animation and rendering. A successful tool change depends on the scene, rig, materials, pipeline integrations and delivery format you need.",
    "alternatives": [
      {
        "name": "Blender",
        "fit": "A free, open-source 3D suite with modeling, rigging, animation, rendering and related tools.",
        "limits": "An interchange format is not the same as a native scene. Blender's current FBX workflow exposes import choices for scale, materials, animation and armatures, and FBX export uses its add-on.",
        "migration": "Keep the Maya scene and export a small representative asset using an agreed interchange format. In Blender, inspect scale, normals, materials, animation and the rig; make any needed adjustments before expanding the pilot. Keep a native Blender working file and verify the required downstream export.",
        "source_urls": [
          "https://www.blender.org/features/",
          "https://docs.blender.org/manual/en/latest/files/import_export/fbx.html"
        ]
      }
    ],
    "source_checked_at": "2026-11-15",
    "review_method": "Publisher documentation reviewed; no hands-on migration or feature-parity test claimed."
  },
  {
    "slug": "adobe-audition",
    "name": "Adobe Audition",
    "aliases": [
      "Audition",
      "Adobe audio",
      "audio editor"
    ],
    "intro": "Audacity is a candidate for recording, editing and exporting audio. Evaluate the real edit, effect chain and delivery format; the two applications do not share a native project format.",
    "alternatives": [
      {
        "name": "Audacity",
        "fit": "Recording, editing and exporting audio with a free, open-source desktop application.",
        "limits": "AUP3 project files are for Audacity, rather than interchange with another audio editor. Audio exports such as WAV or AIFF carry audio, not an assurance that another application's editable session is preserved.",
        "migration": "Keep the original session. Export suitable source tracks or stems from the existing application, import a short sample, rebuild the needed edit, and save an Audacity project. Use Export Audio for the receiving application's required audio format and listen to the complete result.",
        "source_urls": [
          "https://www.audacityteam.org/faq/",
          "https://manual.audacityteam.org/man/faq_opening_and_saving_files.html"
        ]
      }
    ],
    "source_checked_at": "2026-11-15",
    "review_method": "Publisher documentation reviewed; no hands-on migration or feature-parity test claimed."
  }
];
export default alternativeGuides;
