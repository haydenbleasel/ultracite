<script lang="ts">
  const open = () => {};
</script>

<!-- T01: img with no alt -->
<img src="/chart.png" />
<!-- T02: div with onclick -->
<div onclick={open}>Open</div>
<!-- T03: a href="#" -->
<a href="#" onclick={open}>Delete</a>
<!-- T04: iframe with no title -->
<iframe src="https://example.com/embed"></iframe>
<!-- T05: button with no type -->
<button onclick={open}>Save</button>
<!-- T06: input with autofocus -->
<input autofocus type="search" />
<!-- T07: aria-hidden on a button -->
<button aria-hidden="true" type="button">Close</button>
<!-- T08: positive tabindex -->
<input tabindex="2" type="text" />
<!-- T09: empty heading -->
<h2></h2>
<!-- T10: label with no control -->
<label>Name</label>
<input type="text" />
<!-- END -->
