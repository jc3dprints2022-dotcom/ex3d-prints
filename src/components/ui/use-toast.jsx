// ... keep existing code (imports and most of toast hook) ...

  function toast({ ...props }) {
    const id = genId()

    const update = (props: ToasterToast) =>
      dispatch({
        type: "UPDATE_TOAST",
        toast: { ...props, id },
      })
    const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

    dispatch({
      type: "ADD_TOAST",
      toast: {
        ...props,
        id,
        open: true,
        onOpenChange: (open) => {
          if (!open) dismiss()
        },
      },
    })

    // Auto-dismiss after 10 seconds (10000ms)
    setTimeout(() => {
      dismiss()
    }, 10000)

    return {
      id: id,
      dismiss,
      update,
    }
  }

// ... keep existing code (rest of hook) ...